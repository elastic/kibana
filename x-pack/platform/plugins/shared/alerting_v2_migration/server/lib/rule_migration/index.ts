/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { RuleMigrationRegistry } from './rule_migration_registry';
export { RuleMigrationClient } from './rule_migration_client';
export { createRuleMigrationClientFactory } from './create_rule_migration_client_factory';
export { convertClassicRule, isMigratedActionPolicyReady } from './convert_classic_rule';
export type {
  ActionMigrationNote,
  ClassicRule,
  ClassicRuleAction,
  ConvertRuleParams,
  DefaultActionPolicy,
  MigratedActionPolicy,
  RuleMigration,
  RuleMigrationDefinition,
  RuleMigrationResult,
  RuleParamsConversion,
  SkippedActionReason,
  SkippedClassicAction,
} from './types';
