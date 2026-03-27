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
 * - kbn-evals-extensions -> imports from -> kbn-evals
 * - kbn-evals -> MUST NOT import from -> kbn-evals-extensions
 *
 * @packageDocumentation
 */

export {
  createRedTeamRunner,
  createGuardrailsEngine,
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
  AttackResult,
  RedTeamRunSummary,
  GuardrailRule,
  GuardrailAction,
  GuardrailMatch,
  GuardrailCheckResult,
  RedTeamRunnerConfig,
  TaskResult,
} from './src/red_team';
