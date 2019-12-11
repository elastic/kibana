/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { queryRulesSchema } from './query_rules_schema';
import { UpdateRuleAlertParamsRest } from '../../rules/types';

describe('queryRulesSchema', () => {
  test('empty objects do not validate', () => {
    expect(queryRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({}).error).toBeTruthy();
  });

  test('both rule_id and id being supplied dot not validate', () => {
    expect(
      queryRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({ rule_id: '1', id: '1' }).error
    ).toBeTruthy();
  });

  test('only id validates', () => {
    expect(
      queryRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({ id: '1' }).error
    ).toBeFalsy();
  });

  test('only rule_id validates', () => {
    expect(
      queryRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({ rule_id: '1' }).error
    ).toBeFalsy();
  });
});
