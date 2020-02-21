/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { queryRulesSchema } from './query_rules_schema';
import { PatchRuleAlertParamsRest } from '../../rules/types';

describe('queryRulesSchema', () => {
  test('empty objects do not validate', () => {
    expect(queryRulesSchema.validate<Partial<PatchRuleAlertParamsRest>>({}).error).toBeTruthy();
  });

  test('both rule_id and id being supplied do not validate', () => {
    expect(
      queryRulesSchema.validate<Partial<PatchRuleAlertParamsRest>>({ rule_id: '1', id: '1' }).error
        .message
    ).toEqual('"value" contains a conflict between exclusive peers [id, rule_id]');
  });

  test('only id validates', () => {
    expect(
      queryRulesSchema.validate<Partial<PatchRuleAlertParamsRest>>({ id: '1' }).error
    ).toBeFalsy();
  });

  test('only rule_id validates', () => {
    expect(
      queryRulesSchema.validate<Partial<PatchRuleAlertParamsRest>>({ rule_id: '1' }).error
    ).toBeFalsy();
  });
});
