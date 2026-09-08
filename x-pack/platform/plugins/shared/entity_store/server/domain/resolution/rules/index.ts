/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  RESOLUTION_RULE_CONFIGS,
  getResolutionRuleConfig,
  type ResolutionRuleConfig,
} from './rule_registry';
export { ResolutionRulesClient, type EffectiveResolutionRule } from './rule_client';
