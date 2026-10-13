/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  CustomResolutionRulesClient,
  findCustomResolutionRules,
  toRuleDefinition,
  type CustomResolutionRule,
  type CustomResolutionRuleCreate,
  type CustomResolutionRuleUpdate,
  type CustomResolutionRulePreviewRequest,
} from './client';
export {
  CUSTOM_RULE_STATE_KEY_PREFIX,
  customRuleStateKey,
  MAX_CUSTOM_RULE_EXPRESSION_LENGTH,
  MAX_CUSTOM_RULE_ID_LENGTH,
  MAX_CUSTOM_RULE_NAME_LENGTH,
  MAX_CUSTOM_RULE_NAMESPACES,
  MAX_CUSTOM_RULE_NAMESPACE_LENGTH,
} from './constants';
export { fingerprintMatchSpec, toExpressionMatchSpec } from './match_spec';
export type { CustomRulePreview, CustomRulePreviewSample } from './preview';
export { CustomResolutionRuleType, CustomResolutionRuleTypeName } from './saved_object';
