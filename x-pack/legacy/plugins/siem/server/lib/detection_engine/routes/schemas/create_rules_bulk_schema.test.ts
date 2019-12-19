/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRulesBulkSchema } from './create_rules_bulk_schema';
import { UpdateRuleAlertParamsRest } from '../../rules/types';

// only the basics of testing are here.
// see: create_rules_schema.test.ts for the bulk of the validation tests
// this just wraps createRulesSchema in an array
describe('create_rules_bulk_schema', () => {
  test('can take an empty array and validate it', () => {
    expect(
      createRulesBulkSchema.validate<Array<Partial<UpdateRuleAlertParamsRest>>>([]).error
    ).toBeFalsy();
  });

  test('made up values do not validate', () => {
    expect(
      createRulesBulkSchema.validate<[{ madeUp: string }]>([
        {
          madeUp: 'hi',
        },
      ]).error
    ).toBeTruthy();
  });

  test('single array of [id] does validate', () => {
    expect(
      createRulesBulkSchema.validate<Array<Partial<UpdateRuleAlertParamsRest>>>([
        {
          rule_id: 'rule-1',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'severity',
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
      createRulesBulkSchema.validate<Array<Partial<UpdateRuleAlertParamsRest>>>([
        {
          rule_id: 'rule-1',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'severity',
          type: 'query',
          query: 'some query',
          index: ['index-1'],
          interval: '5m',
        },
        {
          rule_id: 'rule-2',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          name: 'some-name',
          severity: 'severity',
          type: 'query',
          query: 'some query',
          index: ['index-1'],
          interval: '5m',
        },
      ]).error
    ).toBeFalsy();
  });
});
