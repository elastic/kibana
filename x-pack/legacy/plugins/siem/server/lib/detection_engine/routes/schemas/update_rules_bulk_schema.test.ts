/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateRulesBulkSchema } from './update_rules_bulk_schema';
import { UpdateRuleAlertParamsRest } from '../../rules/types';

// only the basics of testing are here.
// see: update_rules_schema.test.ts for the bulk of the validation tests
// this just wraps updateRulesSchema in an array
describe('update_rules_bulk_schema', () => {
  test('can take an empty array and validate it', () => {
    expect(
      updateRulesBulkSchema.validate<Array<Partial<UpdateRuleAlertParamsRest>>>([]).error
    ).toBeFalsy();
  });

  test('made up values do not validate', () => {
    expect(
      updateRulesBulkSchema.validate<[{ madeUp: string }]>([
        {
          madeUp: 'hi',
        },
      ]).error
    ).toBeTruthy();
  });

  test('single array of [id] does validate', () => {
    expect(
      updateRulesBulkSchema.validate<Array<Partial<UpdateRuleAlertParamsRest>>>([
        {
          id: 'rule-1',
        },
      ]).error
    ).toBeFalsy();
  });

  test('two values of [id] does validate', () => {
    expect(
      updateRulesBulkSchema.validate<Array<Partial<UpdateRuleAlertParamsRest>>>([
        {
          id: 'rule-1',
        },
        {
          id: 'rule-2',
        },
      ]).error
    ).toBeFalsy();
  });
});
