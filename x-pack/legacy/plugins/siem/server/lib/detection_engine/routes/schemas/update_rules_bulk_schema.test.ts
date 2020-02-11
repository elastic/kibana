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
          id: 'id-1',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'low',
          type: 'query',
          query: 'some query',
          index: ['index-1'],
          interval: '5m',
        },
      ]).error
    ).toBeFalsy();
  });

  test('two values of [id] does validate', () => {
    expect(
      updateRulesBulkSchema.validate<Array<Partial<UpdateRuleAlertParamsRest>>>([
        {
          id: 'id-1',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'low',
          type: 'query',
          query: 'some query',
          index: ['index-1'],
          interval: '5m',
        },
        {
          id: 'id-2',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'low',
          type: 'query',
          query: 'some query',
          index: ['index-1'],
          interval: '5m',
        },
      ]).error
    ).toBeFalsy();
  });
});
