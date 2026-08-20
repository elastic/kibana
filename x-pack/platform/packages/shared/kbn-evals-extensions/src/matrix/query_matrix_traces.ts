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
 * Merges a batch of full (unstripped) score documents for one example into
 * `traces`. Documents arrive in unknown order and span every experiment and
 * repetition that ever scored this example, so this filters to the requested
 * model + execution and keeps the newest complete document.
 */
const processExampleBatch = (
  scores: EvaluationScoreDocument[],
  modelId: string,
  suiteId: string,
  executionId: string,
  traces: MatrixTraceData,
  examplePrefixes: ReadonlySet<string> = new Set()
): boolean => {
  // Filter to this model + this execution, newest first
  const relevant = scores
    .filter((score) => score.task?.model?.id === modelId)
    .filter((score) => score.metadata?.execution_id === executionId)
    .sort((a, b) => {
      const ta = Date.parse(a['@timestamp'] ?? '');
      const tb = Date.parse(b['@timestamp'] ?? '');
      return tb - ta;
    });

  if (relevant.length === 0) return false;

  const entry = extractTraceFromScore(relevant[0]);
  const exampleId = relevant[0].example?.id;
  const datasetId = relevant[0].example?.dataset?.id;

  const complete = isCompleteScore(relevant[0]);

  // Key by model:exampleId for per-prompt detail
  if (exampleId) {
    traces[traceKey(modelId, exampleId)] = entry;
  }
  // Category columns slice the dataset by example.id prefix (examplePrefixes),
  // synthesizing `prefix:<name>` dataset ids. Emit one trace per matching
  // prefix — mirroring scoresByPrefixToDatasets' semantics exactly (equality
  // or boundary dash) — so every category card shows ITS OWN example's
  // conversation instead of falling through to the suite key (which
  // previously made all cards render the same, last-processed example).
  if (exampleId) {
    for (const prefix of examplePrefixes) {
      if (exampleId === prefix || exampleId.startsWith(`${prefix}-`)) {
        const key = traceKey(modelId, `prefix:${prefix}`);
        // First variant wins: all matching variants are valid examples of the
        // category, so keep the lookup deterministic across Set iteration order.
        if (traces[key] === undefined) traces[key] = entry;
      }
    }
  }
  if (datasetId) {
    traces[traceKey(modelId, datasetId)] = entry;
  }
  // For the suite-level key, only complete runs qualify — and the FIRST
  // complete one wins. Overwriting on every example made the suite key
  // "last example processed", which every non-matching card then inherited.
  const suiteTraceKey = traceKey(modelId, suiteId);
  if (complete && traces[suiteTraceKey] === undefined) {
    traces[suiteTraceKey] = entry;
  }

  // If the newest doc is incomplete, fall back to the newest complete one
  if (!complete) {
    const firstComplete = relevant.find(isCompleteScore);
    if (firstComplete) {
      const fallbackEntry = extractTraceFromScore(firstComplete);
      const fid = firstComplete.example?.id;
      if (fid) traces[traceKey(modelId, fid)] = fallbackEntry;
      if (traces[suiteTraceKey] === undefined) {
        traces[suiteTraceKey] = fallbackEntry;
      }
    }
  }

  return complete;
};

/**
 * Queries evaluation score documents from the golden cluster via the evals
 * plugin and extracts trace data (initial question, tool trail, agent answer,
 * step trace) for each (model, column) pair.
 *
 * The per-experiment scores route (`getExperimentScores`) strips unbounded
 * fields (`task.output`, `example.input`, `example.metadata`) from responses,
 * which are exactly the fields the trace detail needs. This function instead
 * uses the per-example scores route (`getExampleScores`), which returns full
 * documents, and filters client-side by model and execution.
 *
 * Example IDs are enumerated from the stripped per-experiment response (which
 * still carries `example.id` and `example.dataset.id`), then each example is
 * fetched once and reused across all models that ran it.
 */
export const queryMatrixTraces = async (
  evalsClient: EvalsClient,
  log: SomeDevLog,
  aggregated: AggregatedModelScores[]
): Promise<MatrixTraceData> => {
  const traces: MatrixTraceData = {};

  // 1. Collect (suite, model, execution) tuples with the example IDs they ran,
  //    from the stripped experiment-scores responses (cheap, no heavy fields).
  interface RunRef {
    suiteId: string;
    modelId: string;
    executionId: string;
    exampleIds: Set<string>;
  }
  const runRefs: RunRef[] = [];

  for (const modelScores of aggregated) {
    for (const suite of modelScores.suites) {
      const { suiteId, experimentId } = suite;
      log.debug(
        `Enumerating examples for experiment ${experimentId} (model ${modelScores.modelId}, suite ${suiteId})`
      );

      const stripped = await evalsClient.getExperimentScores(experimentId, {
        suiteId,
        taskModelId: modelScores.modelId,
        executionId: experimentId,
      });

      const exampleIds = new Set<string>();
      for (const score of stripped) {
        if (score.example?.id) exampleIds.add(score.example.id);
      }

      if (exampleIds.size === 0) {
        log.warning(
          `No example IDs found for suite ${suiteId} (model ${modelScores.modelId}) — trace will be unavailable`
        );
        continue;
      }

      runRefs.push({
        suiteId,
        modelId: modelScores.modelId,
        executionId: experimentId,
        exampleIds,
      });
    }
  }

  // 2. Fetch full score documents once per example (the route returns every
  //    document for that example; we share the result across runs).
  const exampleScores = new Map<string, EvaluationScoreDocument[]>();
  const allExampleIds = new Set<string>();
  for (const ref of runRefs) {
    for (const id of ref.exampleIds) allExampleIds.add(id);
  }

  for (const exampleId of allExampleIds) {
    try {
      exampleScores.set(exampleId, await evalsClient.getExampleScores(exampleId));
    } catch (error) {
      // A single example whose combined documents exceed the transport's size
      // limit must not abort the whole report: scores are already aggregated,
      // only this example's trace detail is lost.
      log.warning(
        `Skipping trace details for example ${exampleId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      exampleScores.set(exampleId, []);
    }
  }

  // Category prefixes come from the same synthetic `prefix:*` dataset ids the
  // score aggregation created (scoresByPrefixToDatasets), so trace bucketing
  // always matches score bucketing — no separate config source to keep in sync.
  const examplePrefixes = new Set<string>();
  for (const modelScores of aggregated) {
    for (const suite of modelScores.suites) {
      for (const dataset of suite.datasets) {
        if (!dataset.datasetId?.startsWith('prefix:')) continue;
        examplePrefixes.add(dataset.datasetId.slice('prefix:'.length));
      }
    }
  }

  // 3. For each run, pick the newest complete document per example and merge
  //    into the traces map.
  for (const ref of runRefs) {
    let completeCount = 0;
    for (const exampleId of ref.exampleIds) {
      const scores = exampleScores.get(exampleId) ?? [];
      const ok = processExampleBatch(
        scores,
        ref.modelId,
        ref.suiteId,
        ref.executionId,
        traces,
        examplePrefixes
      );
      if (ok) completeCount++;
    }
    if (completeCount === 0) {
      log.warning(
        `No complete score documents found for suite ${ref.suiteId} (model ${ref.modelId}, execution ${ref.executionId}) — trace will be unavailable`
      );
    }
  }

  log.debug(`Matrix traces resolved ${Object.keys(traces).length} trace entries`);
  return traces;
};
