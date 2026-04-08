/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @kbn/evals-extensions - Advanced evaluation capabilities
 *
 * This package provides standalone extensions for @kbn/evals.
 * It does NOT modify the core @kbn/evals package.
 *
 * ## Architecture
 *
 * Dependency flow:
 * - ✅ kbn-evals-extensions → imports from → kbn-evals
 * - ❌ kbn-evals → MUST NOT import from → kbn-evals-extensions
 *
 * Evaluation suites can opt-in to extensions by importing directly:
 *
 * @example
 * ```typescript
 * import { evaluate } from '@kbn/evals';
 * import { createToxicityEvaluator, costTracker } from '@kbn/evals-extensions';
 *
 * evaluate('test', async ({ executorClient }) => {
 *   await executorClient.runExperiment(
 *     { dataset, task },
 *     [createToxicityEvaluator()]  // Extension evaluator
 *   );
 *   await costTracker.logRunCost(runId);  // Extension feature
 * });
 * ```
 *
 * ## Roadmap
 *
 * Features are being added incrementally:
 * - **PR #1**: Foundation (current) - Package setup, no functional changes
 * - **PR #2**: Cost tracking & metadata
 * - **PR #3**: Dataset management utilities
 * - **PR #4**: Safety evaluators (toxicity, PII, bias, etc.)
 * - **PR #5**: UI components (run comparison, example explorer)
 * - **PR #6**: DX enhancements (watch mode, caching, parallel execution)
 * - **PR #7**: Advanced analytics (confidence intervals, outlier detection)
 * - **PR #8**: A/B testing & active learning
 * - **PR #9**: Human-in-the-loop workflows
 * - **PR #10**: IDE integration (VS Code extension, Cursor skills)
 *
 * @packageDocumentation
 */

// Re-export core types from kbn-evals for convenience
// This allows users to import from one place, but doesn't create reverse dependency
export type { Evaluator, Example, EvaluationDataset, TaskOutput } from '@kbn/evals';

export type { EvaluationScoreDocument } from '@kbn/evals';

/**
 * Extension-specific types (to be populated in future PRs)
 */
export interface ExtensionConfig {
  /**
   * Configuration for extension features
   * Will be expanded as features are added
   */
  placeholder?: string;
}

/**
 * Feature exports (to be populated in future PRs)
 *
 * Examples of what will be exported:
 * - export { createToxicityEvaluator } from './src/evaluators/safety/toxicity';
 * - export { costTracker } from './src/tracking/cost_calculator';
 * - export { watchMode } from './src/execution/watch_mode';
 * - export { createABTest } from './src/experimentation/ab_testing/framework';
 * - export { reviewQueue } from './src/human_review/workflow/review_workflow';
 */

// Placeholder export to ensure package builds
export const EVALS_EXTENSIONS_VERSION = '1.0.0';
