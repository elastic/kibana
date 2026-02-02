/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { evaluate } from './src/evaluate';
export type { DefaultEvaluators, ReportDisplayOptions } from './src/types';
export type { EvaluationCriterion } from './src/evaluators/criteria';
export { createPlaywrightEvalsConfig } from './src/config/create_playwright_eval_config';
export type { KibanaPhoenixClient } from './src/kibana_phoenix_client/client';
export { createQuantitativeCorrectnessEvaluators } from './src/evaluators/correctness';
export { createQuantitativeGroundednessEvaluator } from './src/evaluators/groundedness';
export type { EvaluationDataset, EvaluationWorkerFixtures, EvaluationReport } from './src/types';
export { withEvaluatorSpan } from './src/utils/tracing';
export {
  containsAllTerms,
  extractAllStrings,
  extractMaxSemver,
  extractReleaseDateNearVersion,
  getBooleanMeta,
  getFinalAssistantMessage,
  getStringMeta,
  getToolCallSteps,
  includesOneOf,
} from './src/utils/evaluation_helpers';
export {
  type EvaluationReporter,
  createDefaultTerminalReporter,
} from './src/utils/reporting/evaluation_reporter';
export type {
  EvaluatorDisplayOptions,
  EvaluatorDisplayGroup,
} from './src/utils/reporting/report_table';
export { formatReportData } from './src/utils/report_model_score';
export { createTable } from './src/utils/reporting/report_table';
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
export { createSpanLatencyEvaluator } from './src/evaluators/trace_based';

export {
  createPrecisionAtKEvaluator,
  createRecallAtKEvaluator,
  createF1AtKEvaluator,
  createRagEvaluators,
} from './src/evaluators/rag';
export type {
  GroundTruth,
  RagEvaluatorConfig,
  RetrievedDocsExtractor,
  GroundTruthExtractor,
  RetrievedDoc,
} from './src/evaluators/rag/types';
