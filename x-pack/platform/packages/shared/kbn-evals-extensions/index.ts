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
 * - kbn-evals-extensions imports from kbn-evals
 * - kbn-evals MUST NOT import from kbn-evals-extensions
 *
 * @packageDocumentation
 */

// Re-export core types from kbn-evals for convenience
export type { Evaluator, Example, EvaluationDataset, TaskOutput } from '@kbn/evals';

export type { EvaluationScoreDocument } from '@kbn/evals';

// --- Phase 4: Dashboard extensions ---
export {
  DASHBOARD_ID,
  DATA_VIEW_ID,
  generateDashboardBody,
  generateDataViewBody,
} from './src/dashboard';

// CLI extensions (delegated from scripts/evals.js for extension commands)
export * as extensionsCli from './src/cli';
