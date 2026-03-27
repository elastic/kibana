/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @kbn/evals-extensions — Advanced evaluation capabilities for @kbn/evals.
 *
 * Provides red-team adversarial testing tools designed to work natively with
 * `executorClient.runExperiment()` from @kbn/evals:
 *
 * - **Attack modules** generate adversarial prompt datasets
 * - **Guardrails evaluator** scans output for security violations
 * - **Dataset builder** produces `EvaluationDataset<AttackExample>` for the framework
 *
 * ## Architecture
 *
 * Dependency flow:
 * - kbn-evals-extensions -> imports from -> kbn-evals
 * - kbn-evals -> MUST NOT import from -> kbn-evals-extensions
 *
 * ## Usage
 *
 * ```ts
 * import { createRedTeamDataset, getRedTeamEvaluators } from '@kbn/evals-extensions';
 *
 * const dataset = createRedTeamDataset({ modules: ['prompt-injection'] });
 * await executorClient.runExperiment({ dataset, task }, getRedTeamEvaluators());
 * ```
 *
 * @packageDocumentation
 */

export {
  createRedTeamDataset,
  createGuardrailsEvaluator,
  createGuardrailsEngine,
  getRedTeamEvaluators,
  DEFAULT_GUARDRAIL_RULES,
  promptInjectionModule,
  privilegeEscalationModule,
  infoExtractionModule,
  jailbreakingModule,
  ALL_MODULES,
  MODULES_BY_NAME,
} from './src/red_team';

export type {
  AttackCategory,
  Severity,
  AttackExample,
  AttackModule,
  AttackModuleConfig,
  RedTeamDatasetConfig,
  RedTeamDataset,
  GuardrailRule,
  GuardrailAction,
  GuardrailMatch,
  GuardrailCheckResult,
  RedTeamEvaluatorsConfig,
} from './src/red_team';
