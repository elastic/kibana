/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @kbn/evals-extensions — standalone extensions for @kbn/evals.
 *
 * Dependency flow:
 * - ✅ kbn-evals-extensions → imports from → kbn-evals
 * - ❌ kbn-evals → MUST NOT import from → kbn-evals-extensions
 *
 * Evaluation suites opt in by importing directly from this package.
 *
 * Boundary tightening: types from `@kbn/evals` (Evaluator, Example,
 * EvaluationDataset, TaskOutput, EvaluationScoreDocument, …) are NOT
 * re-exported from here. Consumers must import them directly from
 * `@kbn/evals` so we keep a single source of truth for those public
 * shapes and avoid duplicate-symbol drift if `@kbn/evals` ever evolves
 * those types in a non-trivially-compatible way.
 */

/**
 * Package version — asserted by the package-health test and used as a
 * quick runtime health check for consumers.
 */
export const EVALS_EXTENSIONS_VERSION = '1.0.0';

// Shared extension types
export type * from './src/types';

// Skill evaluation preset — prompts and factory
export { SKILL_RELEVANCE_PROMPT } from './src/evaluators/skill_preset/relevance';
export { SKILL_COMPLETENESS_PROMPT } from './src/evaluators/skill_preset/completeness';
export { SKILL_ACCURACY_PROMPT } from './src/evaluators/skill_preset/accuracy';
export { SKILL_SPECIFICITY_PROMPT } from './src/evaluators/skill_preset/specificity';
export { SKILL_SAFETY_PROMPT } from './src/evaluators/skill_preset/safety';
export { createSkillEvaluatorPreset } from './src/evaluators/skill_preset';
export type { SkillPresetConfig } from './src/evaluators/skill_preset';

// Skill-preset evaluator factories
export { createSkillRelevanceEvaluator } from './src/evaluators/skill_preset/relevance';
export { createSkillCompletenessEvaluator } from './src/evaluators/skill_preset/completeness';
export { createSkillAccuracyEvaluator } from './src/evaluators/skill_preset/accuracy';
export { createSkillSpecificityEvaluator } from './src/evaluators/skill_preset/specificity';
export { createSkillSafetyEvaluator } from './src/evaluators/skill_preset/safety';

// CODE evaluators (no LLM cost)
export { createBackingIndexValidator } from './src/evaluators/code/backing_index_validator';
export { createEsqlPatternEvaluator } from './src/evaluators/code/esql_pattern';
export { createSkillPiiEvaluator } from './src/evaluators/code/skill_pii';
export { createSecretScannerEvaluator } from './src/evaluators/code/secret_scanner';
export { createPromptInjectionEvaluator } from './src/evaluators/code/prompt_injection';
export { createKeywordsEvaluator } from './src/evaluators/code/keywords';
export type { KeywordsEvaluatorConfig } from './src/evaluators/code/keywords';
export { createPathEfficiencyEvaluator } from './src/evaluators/code/path_efficiency';
export type { PathEfficiencyConfig } from './src/evaluators/code/path_efficiency';
export { createToolSelectionEvaluator } from './src/evaluators/code/tool_selection';
export type { ToolSelectionConfig } from './src/evaluators/code/tool_selection';
export { createToolArgsEvaluator } from './src/evaluators/code/tool_args';
export type { ToolArgsConfig } from './src/evaluators/code/tool_args';
export { createToolSequenceEvaluator } from './src/evaluators/code/tool_sequence';
export { createResistanceEvaluator } from './src/evaluators/code/resistance';
export type { ResistanceConfig } from './src/evaluators/code/resistance';

// Multi-judge evaluator
export { createMultiJudgeEvaluator } from './src/evaluators/multi_judge';
export type { MultiJudgeConfig, AggregationStrategy } from './src/evaluators/multi_judge';

// Scoring helpers
export { computeCompositeScore } from './src/scoring/composite';
export { evaluateCiGates } from './src/scoring/gates';
export { computeTrialMetrics } from './src/scoring/trial_metrics';
export { computeConfidenceInterval } from './src/scoring/confidence';
export { computePairwiseResults } from './src/scoring/pairwise';

// A/B testing
export { runPairwiseExperiment } from './src/ab_testing/pairwise_experiment';
export { testSignificance } from './src/ab_testing/significance';
export { determineWinner } from './src/ab_testing/winner_determination';

// Dataset management
export {
  createVersion,
  findVersionByTag,
  sortVersionsDescending,
  resolveExampleIdsAtVersion,
} from './src/datasets/versioning';
export { assignSplits, computeSplitStats, filterBySplit } from './src/datasets/splits';
export { validateExample, validateDataset } from './src/datasets/schema_validation';
export type {
  ExampleSchema,
  ValidationResult,
  ValidationError,
  DatasetValidationResult,
} from './src/datasets/schema_validation';
export { deduplicateExact, deduplicateBySimilarity } from './src/datasets/deduplication';
export type { DeduplicationResult } from './src/datasets/deduplication';
export { computeDatasetStats } from './src/datasets/statistics';

// Reporting
export { generateMarkdownReport } from './src/reporting/markdown';
export type {
  MarkdownReportConfig,
  MarkdownReportInput,
  EvaluatorSummary,
} from './src/reporting/markdown';
export { generateComparisonReport } from './src/reporting/comparison';
export type {
  ComparisonRunInput,
  ComparisonReport,
  EvaluatorDelta,
} from './src/reporting/comparison';
