/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateRulesSchema } from './update_rules_schema';
import { UpdateRuleAlertParamsRest } from '../../rules/types';
import { ThreatParams } from '../../types';

describe('update rules schema', () => {
  test('empty objects do not validate as they require at least id or rule_id', () => {
    expect(updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({}).error).toBeTruthy();
  });

  test('made up values do not validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest & { madeUp: string }>>({
        madeUp: 'hi',
      }).error
    ).toBeTruthy();
  });

  test('[id] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
      }).error
    ).toBeFalsy();
  });

  test('[id and rule_id] does not validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'id-1',
        rule_id: 'rule-1',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
      }).error
    ).toBeFalsy();
  });

  test('[id, description] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
      }).error
    ).toBeFalsy();
  });

  test('[id, risk_score] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        risk_score: 10,
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, name] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to, name] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, name, severity] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to, name, severity] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, name, severity, type] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to, name, severity, type] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to, name, severity, type, interval] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to, index, name, severity, interval, type] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        query: 'some query',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to, index, name, severity, interval, type, query] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        query: 'some query',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to, index, name, severity, interval, type, query, language] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, type, filter] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('[id, description, from, to, index, name, severity, type, filter] does validate', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('allows references to be sent as a valid value to update with', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
      }).error
    ).toBeFalsy();
  });

  test('does not default references to an array', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        query: 'some-query',
        language: 'kuery',
      }).value.references
    ).toEqual(undefined);
  });

  test('does not default interval', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        type: 'query',
      }).value.interval
    ).toEqual(undefined);
  });

  test('does not default max signal', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
      }).value.max_signals
    ).toEqual(undefined);
  });

  test('references cannot be numbers', () => {
    expect(
      updateRulesSchema.validate<
        Partial<Omit<UpdateRuleAlertParamsRest, 'references'>> & { references: number[] }
      >({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        query: 'some-query',
        language: 'kuery',
        references: [5],
      }).error
    ).toBeTruthy();
  });

  test('indexes cannot be numbers', () => {
    expect(
      updateRulesSchema.validate<
        Partial<Omit<UpdateRuleAlertParamsRest, 'index'>> & { index: number[] }
      >({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: [5],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        query: 'some-query',
        language: 'kuery',
      }).error
    ).toBeTruthy();
  });

  test('saved_id is not required when type is saved_query and will validate without it', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'saved_query',
      }).error
    ).toBeFalsy();
  });

  test('saved_id validates with saved_query', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'saved_query',
        saved_id: 'some id',
      }).error
    ).toBeFalsy();
  });

  test('saved_query type can have filters with it', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'saved_query',
        saved_id: 'some id',
        filters: [],
      }).error
    ).toBeFalsy();
  });

  test('language validates with kuery', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
      }).error
    ).toBeFalsy();
  });

  test('language validates with lucene', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'lucene',
      }).error
    ).toBeFalsy();
  });

  test('language does not validate with something made up', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'something-made-up',
      }).error
    ).toBeTruthy();
  });

  test('max_signals cannot be negative', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: -1,
      }).error
    ).toBeTruthy();
  });

  test('max_signals cannot be zero', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 0,
      }).error
    ).toBeTruthy();
  });

  test('max_signals can be 1', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error
    ).toBeFalsy();
  });

  test('meta can be updated', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        meta: { whateverYouWant: 'anything_at_all' },
      }).error
    ).toBeFalsy();
  });

  test('You update meta as a string', () => {
    expect(
      updateRulesSchema.validate<
        Partial<Omit<UpdateRuleAlertParamsRest, 'meta'> & { meta: string }>
      >({
        id: 'rule-1',
        meta: 'should not work',
      }).error
    ).toBeTruthy();
  });

  test('filters cannot be a string', () => {
    expect(
      updateRulesSchema.validate<
        Partial<Omit<UpdateRuleAlertParamsRest, 'filters'> & { filters: string }>
      >({
        rule_id: 'rule-1',
        type: 'query',
        filters: 'some string',
      }).error
    ).toBeTruthy();
  });

  test('threats is not defaulted to empty array on update', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).value.threats
    ).toBe(undefined);
  });

  test('threats is not defaulted to undefined on update with empty array', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threats: [],
      }).value.threats
    ).toMatchObject([]);
  });
  test('threats is valid when updated with all sub-objects', () => {
    const expected: ThreatParams[] = [
      {
        framework: 'fake',
        tactic: {
          id: 'fakeId',
          name: 'fakeName',
          reference: 'fakeRef',
        },
        techniques: [
          {
            id: 'techniqueId',
            name: 'techniqueName',
            reference: 'techniqueRef',
          },
        ],
      },
    ];
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threats: [
          {
            framework: 'fake',
            tactic: {
              id: 'fakeId',
              name: 'fakeName',
              reference: 'fakeRef',
            },
            techniques: [
              {
                id: 'techniqueId',
                name: 'techniqueName',
                reference: 'techniqueRef',
              },
            ],
          },
        ],
      }).value.threats
    ).toMatchObject(expected);
  });
  test('threats is invalid when updated with missing property framework', () => {
    expect(
      updateRulesSchema.validate<
        Partial<Omit<UpdateRuleAlertParamsRest, 'threats'>> & {
          threats: Array<Partial<Omit<ThreatParams, 'framework'>>>;
        }
      >({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threats: [
          {
            tactic: {
              id: 'fakeId',
              name: 'fakeName',
              reference: 'fakeRef',
            },
            techniques: [
              {
                id: 'techniqueId',
                name: 'techniqueName',
                reference: 'techniqueRef',
              },
            ],
          },
        ],
      }).error
    ).toBeTruthy();
  });
  test('threats is invalid when updated with missing tactic sub-object', () => {
    expect(
      updateRulesSchema.validate<
        Partial<Omit<UpdateRuleAlertParamsRest, 'threats'>> & {
          threats: Array<Partial<Omit<ThreatParams, 'tactic'>>>;
        }
      >({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threats: [
          {
            framework: 'fake',
            techniques: [
              {
                id: 'techniqueId',
                name: 'techniqueName',
                reference: 'techniqueRef',
              },
            ],
          },
        ],
      }).error
    ).toBeTruthy();
  });
  test('threats is invalid when updated with missing techniques', () => {
    expect(
      updateRulesSchema.validate<
        Partial<Omit<UpdateRuleAlertParamsRest, 'threats'>> & {
          threats: Array<Partial<Omit<ThreatParams, 'techniques'>>>;
        }
      >({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threats: [
          {
            framework: 'fake',
            tactic: {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          },
        ],
      }).error
    ).toBeTruthy();
  });

  test('timeline_id validates', () => {
    expect(
      updateRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({
        id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'saved_query',
        saved_id: 'some id',
        timeline_id: 'some-id',
      }).error
    ).toBeFalsy();
  });
});
