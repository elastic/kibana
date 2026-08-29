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
  taskModel: Model;
  /**
   * Default judge model, applied only to scores whose evaluator reports neither a
   * model nor `kind: 'code'`.
   */
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
  evaluatorResults: EvaluatorResult[];
}

/**
 * Builds the score-document `evaluator.name`: the bare evaluator name for
 * single-score evaluators, else `evaluator.score` (e.g. `correctness.factuality`)
 * so each (evaluator, score) ingests as its own idempotent document.
 */
export const composeScoreName = (evaluatorName: string, scoreName: string): string =>
  scoreName === evaluatorName ? evaluatorName : `${evaluatorName}.${scoreName}`;

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
        ...(result.evaluator.version ? { version: result.evaluator.version } : {}),
        ...(score.score !== undefined ? { score: score.score } : {}),
        ...(score.label !== undefined ? { label: score.label } : {}),
        ...(score.explanation !== undefined ? { explanation: score.explanation } : {}),
        ...(score.metadata ? { metadata: score.metadata } : {}),
        ...(score.traceId !== undefined ? { trace_id: score.traceId } : {}),
        ...(result.evaluator.kind ? { kind: result.evaluator.kind } : {}),
        ...(result.evaluator.model ? { model: result.evaluator.model } : {}),
        ...(result.evaluator.direction ? { direction: result.evaluator.direction } : {}),
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
