/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { queryRulesBulkSchema } from './query_rules_bulk_schema';
import { PatchRuleAlertParamsRest } from '../../rules/types';

// only the basics of testing are here.
// see: query_rules_bulk_schema.test.ts for the bulk of the validation tests
// this just wraps queryRulesSchema in an array
describe('query_rules_bulk_schema', () => {
  test('can take an empty array and validate it', () => {
    expect(
      queryRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([]).error
    ).toBeFalsy();
  });

  test('both rule_id and id being supplied do not validate', () => {
    expect(
      queryRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        {
          rule_id: '1',
          id: '1',
        },
      ]).error.message
    ).toEqual(
      '"value" at position 0 fails because ["value" contains a conflict between exclusive peers [id, rule_id]]'
    );
  });

  test('both rule_id and id being supplied do not validate if one array element works but the second does not', () => {
    expect(
      queryRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        {
          id: '1',
        },
        {
          rule_id: '1',
          id: '1',
        },
      ]).error.message
    ).toEqual(
      '"value" at position 1 fails because ["value" contains a conflict between exclusive peers [id, rule_id]]'
    );
  });

  test('only id validates', () => {
    expect(
      queryRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([{ id: '1' }]).error
    ).toBeFalsy();
  });

  test('only id validates with two elements', () => {
    expect(
      queryRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        { id: '1' },
        { id: '2' },
      ]).error
    ).toBeFalsy();
  });

  test('only rule_id validates', () => {
    expect(
      queryRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([{ rule_id: '1' }])
        .error
    ).toBeFalsy();
  });

  test('only rule_id validates with two elements', () => {
    expect(
      queryRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        { rule_id: '1' },
        { rule_id: '2' },
      ]).error
    ).toBeFalsy();
  });

  test('both id and rule_id validates with two separate elements', () => {
    expect(
      queryRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        { id: '1' },
        { rule_id: '2' },
      ]).error
    ).toBeFalsy();
  });
});
