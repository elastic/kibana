/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { evaluate } from './src/evaluate';
export type { DefaultEvaluators } from './src/types';
export type { EvaluationCriterion } from './src/evaluators/criteria';
export { createPlaywrightEvalsConfig } from './src/config/create_playwright_eval_config';
export type { KibanaPhoenixClient } from './src/kibana_phoenix_client/client';
export { createQuantitativeCorrectnessEvaluators } from './src/evaluators/correctness';
export { createQuantitativeGroundednessEvaluator } from './src/evaluators/groundedness';
export type { EvaluationDataset, EvaluationWorkerFixtures } from './src/types';

export {
  createDefaultTerminalReporter,
  createEvaluationReportTable,
  formatReportData,
  type EvaluationReporter,
  type EvaluationReport,
  type EvaluationTableOptions,
} from './src/utils/report_model_score';

export {
  EvaluationScoreRepository,
  type EvaluationScoreDocument,
  parseScoreDocuments,
} from './src/utils/score_repository';

export { getUniqueEvaluatorNames, calculateOverallStats } from './src/utils/evaluation_stats';
export type {
  DatasetScore,
  DatasetScoreWithStats,
  EvaluatorStats,
} from './src/utils/evaluation_stats';

export { parseSelectedEvaluators, selectEvaluators } from './src/evaluators/filter';
