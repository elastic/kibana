/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  EvaluationDataset,
  EvaluationDatasetWithId,
  Example,
  ExampleWithId,
  TaskOutput,
  EvaluatorParams,
  EvaluationResult,
  Evaluator,
  ExperimentTask,
  EvalsExecutorClient,
  TaskRun,
  EvaluationRun,
  RanExperiment,
  EvaluationCompleteEvent,
  OnEvaluationComplete,
} from './src/types';

export { KibanaEvalsClient } from './src/kibana_evals_executor/client';
export type { EvalsLogger } from './src/kibana_evals_executor/client';

export { withEvaluatorSpan, withTaskSpan, getCurrentTraceId } from './src/utils/tracing';

export type { EvaluationScoreDocument, ScoreDocumentRunMetadata } from './src/score_documents';
export { mapToEvaluationScoreDocuments } from './src/score_documents';

export type { ExportEvaluationScoresOptions, ScoreExporterClient } from './src/score_exporter';
export { exportEvaluationScoreDocuments } from './src/score_exporter';
