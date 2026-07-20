/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @kbn/evals-extensions - experimental extensions for @kbn/evals.
 *
 * Home for evals capabilities that are experimental or extended.
 *
 *
 * @packageDocumentation
 */

// Re-export core types from kbn-evals for convenience
// This allows users to import from one place, but doesn't create reverse dependency
export type { Evaluator, Example, EvaluationDataset, TaskOutput } from '@kbn/evals';

export type { EvaluationScoreDocument } from '@kbn/evals-common';

export * as cli from './src/cli';
export { runRedTeam, RED_TEAM_MODULE_IDS } from './src/red_team';
export type { RedTeamConfig, RedTeamReport, RedTeamModuleId } from './src/red_team';

// LLM performance matrix engine (invoked as a workflow via `node scripts/evals ext matrix`).
export { loadMatrixConfig, parseMatrixConfig } from './src/matrix/load_matrix_config';
export type {
  MatrixConfig,
  MatrixColumnConfig,
  MatrixCompositeConfig,
  MatrixModelConfig,
} from './src/matrix/load_matrix_config';
export { buildMatrix, OVERALL_COLUMN_ID } from './src/matrix/build_matrix';
export type { Matrix, MatrixRow, MatrixCell, MatrixDisplayColumn } from './src/matrix/build_matrix';
export { renderMatrix } from './src/matrix/render_matrix';
export type { RenderedMatrix } from './src/matrix/render_matrix';
export { queryMatrixScores } from './src/matrix/query_matrix_scores';
export type {
  AggregatedModelScores,
  AggregatedSuiteScores,
  AggregatedDatasetScores,
  AggregatedEvaluatorScore,
  QueryMatrixScoresOptions,
} from './src/matrix/query_matrix_scores';
