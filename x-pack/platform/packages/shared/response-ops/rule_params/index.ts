/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ruleParamsSchemaWithRuleTypeId,
  ruleParamsSchemaWithRuleTypeIdAndDefaultValue,
  ruleParamsSchemaWithRuleTypeIdForUpdate,
  ruleParamsSchemaWithRuleTypeIdAndDefaultValueForUpdate,
} from './latest';

export {
  ruleParamsSchemaWithRuleTypeId as ruleParamsSchemaWithRuleTypeIdV1,
  ruleParamsSchemaWithRuleTypeIdAndDefaultValue as ruleParamsSchemaWithRuleTypeIdAndDefaultValueV1,
  ruleParamsSchemaWithRuleTypeIdForUpdate as ruleParamsSchemaWithRuleTypeIdForUpdateV1,
  ruleParamsSchemaWithRuleTypeIdAndDefaultValueForUpdate as ruleParamsSchemaWithRuleTypeIdAndDefaultValueForUpdateV1,
  createRuleParamsExamples as createRuleParamsExamplesV1,
} from './v1';

export type {
  RuleParams,
  RuleParamsForUpdate,
  RuleParamsWithDefaultValue,
  RuleParamsWithDefaultValueForUpdate,
} from './latest';

export type {
  RuleParams as RuleParamsV1,
  RuleParamsWithDefaultValue as RuleParamsWithDefaultValueV1,
  RuleParamsForUpdate as RuleParamsForUpdateV1,
  RuleParamsWithDefaultValueForUpdate as RuleParamsWithDefaultValueForUpdateV1,
} from './v1';

export { RULE_TYPE_ID, ALERT_TYPE_ID } from './v1';
