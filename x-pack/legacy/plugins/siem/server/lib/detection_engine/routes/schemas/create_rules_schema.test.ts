/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRulesSchema } from './create_rules_schema';
import { PatchRuleAlertParamsRest } from '../../rules/types';
import { ThreatParams, RuleAlertParamsRest } from '../../types';

describe('create rules schema', () => {
  test('empty objects do not validate', () => {
    expect(createRulesSchema.validate<Partial<PatchRuleAlertParamsRest>>({}).error).toBeTruthy();
  });

  test('made up values do not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest & { madeUp: string }>>({
        madeUp: 'hi',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
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
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity, type] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity, type, interval, index] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        interval: '5m',
        index: ['index-1'],
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name, severity, type, query, index, interval] does validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
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
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score] does validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some query',
        language: 'kuery',
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score] does validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        risk_score: 50,
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index] does validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      }).error
    ).toBeFalsy();
  });

  test('You can send in an empty array to threat', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threat: [],
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        threat: [
          {
            framework: 'someFramework',
            tactic: {
              id: 'fakeId',
              name: 'fakeName',
              reference: 'fakeRef',
            },
            technique: [
              {
                id: 'techniqueId',
                name: 'techniqueName',
                reference: 'techniqueRef',
              },
            ],
          },
        ],
      }).error
    ).toBeFalsy();
  });

  test('allows references to be sent as valid', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
      }).error
    ).toBeFalsy();
  });

  test('defaults references to an array', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some-query',
        language: 'kuery',
      }).value.references
    ).toEqual([]);
  });

  test('references cannot be numbers', () => {
    expect(
      createRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'references'>> & { references: number[] }
      >({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some-query',
        language: 'kuery',
        references: [5],
      }).error.message
    ).toEqual(
      'child "references" fails because ["references" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('indexes cannot be numbers', () => {
    expect(
      createRulesSchema.validate<Partial<Omit<RuleAlertParamsRest, 'index'>> & { index: number[] }>(
        {
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: [5],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          query: 'some-query',
          language: 'kuery',
        }
      ).error.message
    ).toEqual(
      'child "index" fails because ["index" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('defaults interval to 5 min', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        type: 'query',
      }).value.interval
    ).toEqual('5m');
  });

  test('defaults max signals to 100', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      }).value.max_signals
    ).toEqual(100);
  });

  test('saved_id is required when type is saved_query and will not validate without out', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'saved_query',
      }).error.message
    ).toEqual('child "saved_id" fails because ["saved_id" is required]');
  });

  test('saved_id is required when type is saved_query and validates with it', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        output_index: '.siem-signals',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'saved_query',
        saved_id: 'some id',
      }).error
    ).toBeFalsy();
  });

  test('saved_query type can have filters with it', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'saved_query',
        saved_id: 'some id',
        filters: [],
      }).error
    ).toBeFalsy();
  });

  test('filters cannot be a string', () => {
    expect(
      createRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'filters'> & { filters: string }>
      >({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'saved_query',
        saved_id: 'some id',
        filters: 'some string',
      }).error.message
    ).toEqual('child "filters" fails because ["filters" must be an array]');
  });

  test('language validates with kuery', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
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
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        output_index: '.siem-signals',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
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
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'something-made-up',
      }).error.message
    ).toEqual('child "language" fails because ["language" must be one of [kuery, lucene]]');
  });

  test('max_signals cannot be negative', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: -1,
      }).error.message
    ).toEqual('child "max_signals" fails because ["max_signals" must be greater than 0]');
  });

  test('max_signals cannot be zero', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 0,
      }).error.message
    ).toEqual('child "max_signals" fails because ["max_signals" must be greater than 0]');
  });

  test('max_signals can be 1', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can optionally send in an array of tags', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        tags: ['tag_1', 'tag_2'],
      }).error
    ).toBeFalsy();
  });

  test('You cannot send in an array of tags that are numbers', () => {
    expect(
      createRulesSchema.validate<Partial<Omit<RuleAlertParamsRest, 'tags'>> & { tags: number[] }>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        tags: [0, 1, 2],
      }).error.message
    ).toEqual(
      'child "tags" fails because ["tags" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('You cannot send in an array of threat that are missing "framework"', () => {
    expect(
      createRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'threat'>> & {
          threat: Array<Partial<Omit<ThreatParams, 'framework'>>>;
        }
      >({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threat: [
          {
            tactic: {
              id: 'fakeId',
              name: 'fakeName',
              reference: 'fakeRef',
            },
            technique: [
              {
                id: 'techniqueId',
                name: 'techniqueName',
                reference: 'techniqueRef',
              },
            ],
          },
        ],
      }).error.message
    ).toEqual(
      'child "threat" fails because ["threat" at position 0 fails because [child "framework" fails because ["framework" is required]]]'
    );
  });

  test('You cannot send in an array of threat that are missing "tactic"', () => {
    expect(
      createRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'threat'>> & {
          threat: Array<Partial<Omit<ThreatParams, 'tactic'>>>;
        }
      >({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threat: [
          {
            framework: 'fake',
            technique: [
              {
                id: 'techniqueId',
                name: 'techniqueName',
                reference: 'techniqueRef',
              },
            ],
          },
        ],
      }).error.message
    ).toEqual(
      'child "threat" fails because ["threat" at position 0 fails because [child "tactic" fails because ["tactic" is required]]]'
    );
  });

  test('You cannot send in an array of threat that are missing "technique"', () => {
    expect(
      createRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'threat'>> & {
          threat: Array<Partial<Omit<ThreatParams, 'technique'>>>;
        }
      >({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threat: [
          {
            framework: 'fake',
            tactic: {
              id: 'fakeId',
              name: 'fakeName',
              reference: 'fakeRef',
            },
          },
        ],
      }).error.message
    ).toEqual(
      'child "threat" fails because ["threat" at position 0 fails because [child "technique" fails because ["technique" is required]]]'
    );
  });

  test('You can optionally send in an array of false positives', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        false_positives: ['false_1', 'false_2'],
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error
    ).toBeFalsy();
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    expect(
      createRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'false_positives'>> & { false_positives: number[] }
      >({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        false_positives: [5, 4],
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error.message
    ).toEqual(
      'child "false_positives" fails because ["false_positives" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('You cannot set the immutable when trying to create a rule', () => {
    expect(
      createRulesSchema.validate<
        Partial<Omit<RuleAlertParamsRest, 'immutable'>> & { immutable: number }
      >({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: 5,
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error.message
    ).toEqual('"immutable" is not allowed');
  });

  test('You cannot set the risk_score to 101', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 101,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error.message
    ).toEqual('child "risk_score" fails because ["risk_score" must be less than 101]');
  });

  test('You cannot set the risk_score to -1', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: -1,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error.message
    ).toEqual('child "risk_score" fails because ["risk_score" must be greater than -1]');
  });

  test('You can set the risk_score to 0', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 0,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can set the risk_score to 100', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 100,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can set meta to any object you want', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        meta: {
          somethingMadeUp: { somethingElse: true },
        },
      }).error
    ).toBeFalsy();
  });

  test('You cannot create meta as a string', () => {
    expect(
      createRulesSchema.validate<Partial<Omit<RuleAlertParamsRest, 'meta'> & { meta: string }>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        meta: 'should not work',
      }).error.message
    ).toEqual('child "meta" fails because ["meta" must be an object]');
  });

  test('You can omit the query string when filters are present', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        language: 'kuery',
        filters: [],
        max_signals: 1,
      }).error
    ).toBeFalsy();
  });

  test('validates with timeline_id and timeline_title', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        timeline_id: 'timeline-id',
        timeline_title: 'timeline-title',
      }).error
    ).toBeFalsy();
  });

  test('You cannot omit timeline_title when timeline_id is present', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        timeline_id: 'some_id',
      }).error.message
    ).toEqual('child "timeline_title" fails because ["timeline_title" is required]');
  });

  test('You cannot have a null value for timeline_title when timeline_id is present', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        timeline_id: 'some_id',
        timeline_title: null,
      }).error.message
    ).toEqual('child "timeline_title" fails because ["timeline_title" must be a string]');
  });

  test('You cannot have empty string for timeline_title when timeline_id is present', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        timeline_id: 'some_id',
        timeline_title: '',
      }).error.message
    ).toEqual('child "timeline_title" fails because ["timeline_title" is not allowed to be empty]');
  });

  test('You cannot have timeline_title with an empty timeline_id', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        timeline_id: '',
        timeline_title: 'some-title',
      }).error.message
    ).toEqual('child "timeline_id" fails because ["timeline_id" is not allowed to be empty]');
  });

  test('You cannot have timeline_title without timeline_id', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        timeline_title: 'some-title',
      }).error.message
    ).toEqual('child "timeline_title" fails because ["timeline_title" is not allowed]');
  });

  test('The default for "from" will be "now-6m"', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).value.from
    ).toEqual('now-6m');
  });

  test('The default for "to" will be "now"', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).value.to
    ).toEqual('now');
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    expect(
      createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        name: 'some-name',
        severity: 'junk',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).error.message
    ).toEqual(
      'child "severity" fails because ["severity" must be one of [low, medium, high, critical]]'
    );
  });
});
