/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvalsClient } from '@kbn/evals';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import type { AggregatedModelScores } from './query_matrix_scores';
import type { MatrixTraceData, MatrixTraceEntry, TraceStep } from './trace_types';
import { traceKey } from './trace_types';

/** Maximum number of experiments to scan for complete scores per (suite, model). */
const MAX_EXPERIMENTS_TO_SCAN = 5;

/**
 * Extracts trace data (initial question, tool trail, agent answer, step trace)
 * from a single evaluation score document.
 *
 * Score documents store the full `task.output` which contains:
 * - `steps`: array of `{ type: "reasoning"|"tool_call"|"relevant_skills", ... }`
 * - `messages`: array of `{ message: string }` (the agent's final answer)
 * And `example.input.question` holds the initial user question.
 */
const extractTraceFromScore = (score: EvaluationScoreDocument): MatrixTraceEntry => {
  const question = (score.example?.input as { question?: string } | null)?.question;
  const taskOutput = score.task?.output as
    | {
        steps?: Array<Record<string, unknown>>;
        messages?: Array<{ message?: string }>;
      }
    | null
    | undefined;

  const steps: TraceStep[] = [];
  const toolTrail: string[] = [];

  for (const step of taskOutput?.steps ?? []) {
    const stepType = step.type as string | undefined;
    if (stepType === 'tool_call') {
      const toolId = step.tool_id as string | undefined;
      if (toolId) {
        toolTrail.push(toolId);
      }
      steps.push({
        type: 'tool',
        toolId,
        toolParams: step.args ? JSON.stringify(step.args).slice(0, 300) : undefined,
      });
    } else if (stepType === 'reasoning') {
      steps.push({
        type: 'reasoning',
        text: (step.reasoning as string | undefined)?.slice(0, 500),
      });
    } else if (stepType === 'relevant_skills') {
      const skills = Array.isArray(step.skills)
        ? (step.skills as Array<{ id?: string }>)
            .map((s) => s.id)
            .filter((id): id is string => Boolean(id))
        : undefined;
      steps.push({ type: 'skill', skills });
    }
  }

  // The final answer is the last non-empty message
  let answer: string | undefined;
  for (const msg of taskOutput?.messages ?? []) {
    const content = msg.message;
    if (content && content.length > 50) {
      answer = content;
    }
  }

  return {
    question,
    toolTrail: toolTrail.length > 0 ? toolTrail : undefined,
    answer: answer || undefined,
    steps: steps.length > 0 ? steps : undefined,
    stepCount: steps.length,
    toolCount: toolTrail.length,
  };
};

/**
 * A score document is considered "complete" when:
 * - `evaluator.score` is non-null (the evaluator finished and produced a verdict)
 * - `task.output` is non-null (the agent produced output — steps and/or messages)
 *
 * Incomplete runs (e.g. worker SIGKILL, OOM, timeout) may still write partial
 * score documents with null scores or empty output. These should not pollute
 * the matrix because they don't represent a real evaluation.
 */
const isCompleteScore = (score: EvaluationScoreDocument): boolean => {
  if (score.evaluator?.score == null) return false;
  return score.task?.output != null;
};

/**
 * Processes a batch of score documents (all from the same experiment) and
 * populates `traces` with per-example and per-suite entries. Only the latest
 * complete score per suite is used.
 *
 * @returns The number of complete scores found in this batch.
 */
const processScoreBatch = (
  scores: EvaluationScoreDocument[],
  modelId: string,
  suiteId: string,
  traces: MatrixTraceData
): number => {
  // Sort by @timestamp descending so the latest complete run wins
  const sorted = [...scores].sort((a, b) => {
    const ta = Date.parse(a['@timestamp'] ?? '');
    const tb = Date.parse(b['@timestamp'] ?? '');
    return tb - ta;
  });

  let suiteTraceAssigned = false;
  let completeCount = 0;

  for (const score of sorted) {
    const entry = extractTraceFromScore(score);
    const datasetId = score.example?.dataset?.id;
    const exampleId = score.example?.id;

    // Key by model:exampleId for per-prompt detail
    if (exampleId) {
      traces[traceKey(modelId, exampleId)] = entry;
    }
    if (datasetId) {
      traces[traceKey(modelId, datasetId)] = entry;
    }

    // For the suite-level key, pick the latest **complete** run only.
    if (!suiteTraceAssigned && isCompleteScore(score)) {
      traces[traceKey(modelId, suiteId)] = entry;
      suiteTraceAssigned = true;
      completeCount++;
    }
  }

  return completeCount;
};

/**
 * Queries evaluation score documents from the golden cluster via the evals
 * plugin and extracts trace data (initial question, tool trail, agent answer,
 * step trace) for each (model, column) pair.
 *
 * Uses the same experiment IDs resolved by `queryMatrixScores` to fetch the
 * full score documents — which include `task.output.steps` and
 * `example.input.question` — and maps them into `MatrixTraceData`.
 *
 * If the latest experiment has no complete scores (e.g. worker died mid-run),
 * it falls back to scanning up to `MAX_EXPERIMENTS_TO_SCAN` earlier
 * experiments for the same (suite, model) to find the latest complete run.
 */
export const queryMatrixTraces = async (
  evalsClient: EvalsClient,
  log: SomeDevLog,
  aggregated: AggregatedModelScores[]
): Promise<MatrixTraceData> => {
  const traces: MatrixTraceData = {};

  for (const modelScores of aggregated) {
    for (const suite of modelScores.suites) {
      const { suiteId, experimentId } = suite;
      log.debug(
        `Fetching score documents for experiment ${experimentId} (model ${modelScores.modelId}, suite ${suiteId})`
      );

      // First try the latest experiment
      let scores = await evalsClient.getExperimentScores(experimentId, {
        suiteId,
        taskModelId: modelScores.modelId,
        executionId: experimentId,
      });

      let completeCount = processScoreBatch(scores, modelScores.modelId, suiteId, traces);

      // If no complete scores found, scan earlier experiments
      if (completeCount === 0) {
        log.debug(
          `No complete scores in latest experiment ${experimentId}, scanning earlier runs...`
        );

        const experiments = await evalsClient.listExperiments({
          suiteId,
          taskModelId: modelScores.modelId,
          limit: MAX_EXPERIMENTS_TO_SCAN,
        });

        // Skip the first one (already tried), try the rest in order
        for (const exp of experiments.slice(1)) {
          if (exp.experiment_id === experimentId) continue;

          log.debug(`Trying earlier experiment ${exp.experiment_id}...`);
          scores = await evalsClient.getExperimentScores(exp.experiment_id, {
            suiteId,
            taskModelId: modelScores.modelId,
            executionId: exp.execution_id ?? exp.experiment_id,
          });

          completeCount = processScoreBatch(scores, modelScores.modelId, suiteId, traces);

          if (completeCount > 0) {
            log.debug(
              `Found ${completeCount} complete score(s) in earlier experiment ${exp.experiment_id}`
            );
            break;
          }
        }
      }

      if (completeCount === 0) {
        log.warning(
          `No complete score documents found for suite ${suiteId} (model ${modelScores.modelId}) ` +
            `across ${MAX_EXPERIMENTS_TO_SCAN} experiments — trace will be unavailable`
        );
      }
    }
  }

  log.debug(`Matrix traces resolved ${Object.keys(traces).length} trace entries`);
  return traces;
};
