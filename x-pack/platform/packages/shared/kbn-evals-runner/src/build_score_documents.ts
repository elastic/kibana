/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestScoresRequestBody, Model } from '@kbn/evals-common';
import type { EvaluatorResult, ScoreDocumentMetadata } from './types';

export interface BuildScoreDocumentsParams {
  experimentId: string;
  experimentName?: string;
  /** The model under evaluation (the task's connector/model). */
  taskModel: Model;
  /** The model used by LLM judges. Use the task model for code-only evaluators. */
  evaluatorModel: Model;
  metadata: ScoreDocumentMetadata;
  example: {
    id: string;
    index: number;
    input?: Record<string, unknown>;
    dataset: { id: string; name: string };
  };
  task: {
    traceId?: string;
    repetitionIndex: number;
    output?: Record<string, unknown>;
  };
  /** Results from one or more evaluators, each of which may emit many scores. */
  evaluatorResults: EvaluatorResult[];
}

/**
 * Composes the score-document `evaluator.name` from an evaluator name and one of
 * its named scores. Single-score evaluators (where the score shares the
 * evaluator's name) keep the bare evaluator name; multi-score evaluators are
 * namespaced (e.g. `correctness.factuality`). Distinct names are required so the
 * ingest layer produces one idempotent document per (evaluator, score).
 */
export const composeScoreName = (evaluatorName: string, scoreName: string): string =>
  scoreName === evaluatorName ? evaluatorName : `${evaluatorName}.${scoreName}`;

/**
 * Fans each (evaluator, score) pair from a single (example, repetition) into its
 * own score document and assembles the `POST /internal/evals/scores` request
 * body. This is the shared shape used by both offline and online evaluation
 * paths so score persistence stays consistent.
 */
export const buildScoreDocuments = (params: BuildScoreDocumentsParams): IngestScoresRequestBody => {
  const {
    experimentId,
    experimentName,
    taskModel,
    evaluatorModel,
    metadata,
    example,
    task,
    evaluatorResults,
  } = params;

  const scores = evaluatorResults.flatMap((result) =>
    result.scores.map((score) => ({
      example: {
        id: example.id,
        index: example.index,
        ...(example.input ? { input: example.input } : {}),
        dataset: { id: example.dataset.id, name: example.dataset.name },
      },
      task: {
        ...(task.traceId ? { trace_id: task.traceId } : {}),
        repetition_index: task.repetitionIndex,
        ...(task.output ? { output: task.output } : {}),
      },
      evaluator: {
        name: composeScoreName(result.evaluator.name, score.name),
        ...(score.score !== undefined ? { score: score.score } : {}),
        ...(score.label !== undefined ? { label: score.label } : {}),
        ...(score.explanation !== undefined ? { explanation: score.explanation } : {}),
        ...(score.metadata ? { metadata: score.metadata } : {}),
        ...(score.traceId !== undefined ? { trace_id: score.traceId } : {}),
      },
    }))
  );

  return {
    experiment_id: experimentId,
    ...(experimentName ? { experiment_name: experimentName } : {}),
    task_model: taskModel,
    evaluator_model: evaluatorModel,
    metadata: {
      ...(metadata.executionId ? { execution_id: metadata.executionId } : {}),
      ...(metadata.suiteId ? { suite_id: metadata.suiteId } : {}),
      total_repetitions: metadata.totalRepetitions,
      hostname: metadata.hostname,
      ...(metadata.git ? { git: metadata.git } : {}),
      ...(metadata.ci ? { ci: metadata.ci } : {}),
    },
    scores,
  };
};
