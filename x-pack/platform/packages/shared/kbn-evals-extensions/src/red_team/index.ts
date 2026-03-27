/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { promptInjectionModule } from './modules/prompt_injection';
export { privilegeEscalationModule } from './modules/privilege_escalation';
export { infoExtractionModule } from './modules/info_extraction';
export { jailbreakingModule } from './modules/jailbreaking';
export {
  createGuardrailsEvaluator,
  createGuardrailsEngine,
  DEFAULT_GUARDRAIL_RULES,
} from './guardrails';
export { createRedTeamDataset, ALL_MODULES, MODULES_BY_NAME } from './dataset';
export { getRedTeamEvaluators } from './evaluators';
export type { RedTeamEvaluatorsConfig } from './evaluators';
export type {
  AttackCategory,
  Severity,
  AttackExample,
  AttackModule,
  AttackModuleConfig,
  RedTeamDatasetConfig,
  RedTeamDataset,
} from './types';
export type {
  GuardrailRule,
  GuardrailAction,
  GuardrailMatch,
  GuardrailCheckResult,
} from './guardrails';
