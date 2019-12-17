/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UpdateRuleAlertParamsRest } from '../../rules/types';
import { ThreatParams, RuleAlertParamsRest } from '../../types';
import { addPrepackagedRulesSchema } from './add_prepackaged_rules_schema';

describe('add prepackaged rules schema', () => {
  test('empty objects do not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({}).error
    ).toBeTruthy();
  });

  test('made up values do not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest & { madeUp: string }>>({
        madeUp: 'hi',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity, type] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
        type: 'query',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity, type, interval, index] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'severity',
        type: 'query',
        interval: '5m',
        index: ['index-1'],
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity, type, query, index, interval, version] does validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
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
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, version] does validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does not validate because output_index is not allowed', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, version] does validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        risk_score: 50,
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can send in an empty array to threats', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeFalsy();
  });
  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, version, threats] does validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        threats: [
          {
            framework: 'someFramework',
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('allows references to be sent as valid', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('defaults references to an array', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).value.references
    ).toEqual([]);
  });

  test('defaults immutable to true', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).value.immutable
    ).toEqual(true);
  });

  test('defaults enabled to false', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).value.enabled
    ).toEqual(false);
  });

  test('rule_id is required', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('references cannot be numbers', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'references'>> & { references: number[] }
      >({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('indexes cannot be numbers', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'index'>> & { index: number[] }
      >({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('defaults interval to 5 min', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        type: 'query',
        version: 1,
      }).value.interval
    ).toEqual('5m');
  });

  test('defaults max signals to 100', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        version: 1,
      }).value.max_signals
    ).toEqual(100);
  });

  test('saved_id is required when type is saved_query and will not validate without out', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'saved_query',
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('saved_id is required when type is saved_query and validates with it', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'saved_query',
        saved_id: 'some id',
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('saved_query type can have filters with it', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('filters cannot be a string', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'filters'> & { filters: string }>
      >({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'saved_query',
        saved_id: 'some id',
        filters: 'some string',
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('language validates with kuery', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('language validates with lucene', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('language does not validate with something made up', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('max_signals cannot be negative', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('max_signals cannot be zero', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('max_signals can be 1', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can optionally send in an array of tags', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
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
        tags: ['tag_1', 'tag_2'],
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You cannot send in an array of tags that are numbers', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'tags'>> & { tags: number[] }
      >({
        rule_id: 'rule-1',
        risk_score: 50,
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
        tags: [0, 1, 2],
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('You cannot send in an array of threats that are missing "framework"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'threats'>> & {
          threats: Array<Partial<Omit<ThreatParams, 'framework'>>>;
        }
      >({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });
  test('You cannot send in an array of threats that are missing "tactic"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'threats'>> & {
          threats: Array<Partial<Omit<ThreatParams, 'tactic'>>>;
        }
      >({
        rule_id: 'rule-1',
        risk_score: 50,
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
        version: 1,
      }).error
    ).toBeTruthy();
  });
  test('You cannot send in an array of threats that are missing "techniques"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'threats'>> & {
          threats: Array<Partial<Omit<ThreatParams, 'technique'>>>;
        }
      >({
        rule_id: 'rule-1',
        risk_score: 50,
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
          },
        ],
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('You can optionally send in an array of false positives', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        false_positives: ['false_1', 'false_2'],
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'false_positives'>> & { false_positives: number[] }
      >({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        false_positives: [5, 4],
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
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('You can optionally set the immutable to be true', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You cannot set the immutable to be a number', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'immutable'>> & { immutable: number }
      >({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: 5,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('You cannot set the risk_score to 101', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 101,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('You cannot set the risk_score to -1', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: -1,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('You can set the risk_score to 0', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 0,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can set the risk_score to 100', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 100,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can set meta to any object you want', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        meta: {
          somethingMadeUp: { somethingElse: true },
        },
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You cannot create meta as a string', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'meta'> & { meta: string }>
      >({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        meta: 'should not work',
        version: 1,
      }).error
    ).toBeTruthy();
  });

  test('You can omit the query string when filters are present', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'meta'> & { meta: string }>
      >({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
        index: ['index-1'],
        name: 'some-name',
        severity: 'severity',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        language: 'kuery',
        filters: [],
        max_signals: 1,
        version: 1,
      }).error
    ).toBeFalsy();
  });
});
