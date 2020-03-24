/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertAction } from '../../../../../../../../plugins/alerting/common';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { ThreatParams, PrepackagedRules } from '../../types';
import { addPrepackagedRulesSchema } from './add_prepackaged_rules_schema';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../feature_flags';

describe('add prepackaged rules schema', () => {
  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  test('empty objects do not validate', () => {
    expect(addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({}).error).toBeTruthy();
  });

  test('made up values do not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules & { madeUp: string }>>({
        madeUp: 'hi',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        description: 'some description',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
      }).error
    ).toBeTruthy();
  });

  test('[rule_id, description, from, to, name] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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

  test('[rule_id, description, from, to, name, severity, type, query, index, interval, version] does validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, version] does validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does not validate because output_index is not allowed', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        version: 1,
      }).error.message
    ).toEqual('"output_index" is not allowed');
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, version] does validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can send in an empty array to threat', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        threat: [],
        version: 1,
      }).error
    ).toBeFalsy();
  });
  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, version, s] does validate', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('allows references to be sent as valid', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('defaults references to an array', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        query: 'some-query',
        language: 'kuery',
        version: 1,
      }).value.references
    ).toEqual([]);
  });

  test('defaults immutable to true', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        query: 'some-query',
        language: 'kuery',
        version: 1,
      }).value.immutable
    ).toEqual(true);
  });

  test('immutable cannot be set in a pre-packaged rule', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        immutable: true,
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some-query',
        language: 'kuery',
        version: 1,
      }).error.message
    ).toEqual('child "immutable" fails because ["immutable" is not allowed]');
  });

  test('defaults enabled to false', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        query: 'some-query',
        language: 'kuery',
        version: 1,
      }).value.enabled
    ).toEqual(false);
  });

  test('rule_id is required', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        version: 1,
      }).error.message
    ).toEqual('child "rule_id" fails because ["rule_id" is required]');
  });

  test('references cannot be numbers', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'references'>> & { references: number[] }
      >({
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
        query: 'some-query',
        language: 'kuery',
        references: [5],
        version: 1,
      }).error.message
    ).toEqual(
      'child "references" fails because ["references" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('indexes cannot be numbers', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'index'>> & { index: number[] }
      >({
        rule_id: 'rule-1',
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
        version: 1,
      }).error.message
    ).toEqual(
      'child "index" fails because ["index" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('defaults interval to 5 min', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        type: 'query',
        version: 1,
      }).value.interval
    ).toEqual('5m');
  });

  test('defaults max signals to 100', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        version: 1,
      }).value.max_signals
    ).toEqual(100);
  });

  test('saved_id is required when type is saved_query and will not validate without out', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'saved_query',
        version: 1,
      }).error.message
    ).toEqual('child "saved_id" fails because ["saved_id" is required]');
  });

  test('saved_id is required when type is saved_query and validates with it', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('saved_query type can have filters with it', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('filters cannot be a string', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'filters'> & { filters: string }>
      >({
        rule_id: 'rule-1',
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
        version: 1,
      }).error.message
    ).toEqual('child "filters" fails because ["filters" must be an array]');
  });

  test('language validates with kuery', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('language validates with lucene', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        query: 'some query',
        language: 'lucene',
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('language does not validate with something made up', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        query: 'some query',
        language: 'something-made-up',
        version: 1,
      }).error.message
    ).toEqual('child "language" fails because ["language" must be one of [kuery, lucene]]');
  });

  test('max_signals cannot be negative', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: -1,
        version: 1,
      }).error.message
    ).toEqual('child "max_signals" fails because ["max_signals" must be greater than 0]');
  });

  test('max_signals cannot be zero', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 0,
        version: 1,
      }).error.message
    ).toEqual('child "max_signals" fails because ["max_signals" must be greater than 0]');
  });

  test('max_signals can be 1', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        Partial<Omit<PrepackagedRules, 'tags'>> & { tags: number[] }
      >({
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
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        tags: [0, 1, 2],
        version: 1,
      }).error.message
    ).toEqual(
      'child "tags" fails because ["tags" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('You cannot send in an array of threat that are missing "framework"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'threat'>> & {
          threat: Array<Partial<Omit<ThreatParams, 'framework'>>>;
        }
      >({
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
        version: 1,
      }).error.message
    ).toEqual(
      'child "threat" fails because ["threat" at position 0 fails because [child "framework" fails because ["framework" is required]]]'
    );
  });

  test('You cannot send in an array of threat that are missing "tactic"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'threat'>> & {
          threat: Array<Partial<Omit<ThreatParams, 'tactic'>>>;
        }
      >({
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
        version: 1,
      }).error.message
    ).toEqual(
      'child "threat" fails because ["threat" at position 0 fails because [child "tactic" fails because ["tactic" is required]]]'
    );
  });

  test('You cannot send in an array of threat that are missing "technique"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'threat'>> & {
          threat: Array<Partial<Omit<ThreatParams, 'technique'>>>;
        }
      >({
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
        version: 1,
      }).error.message
    ).toEqual(
      'child "threat" fails because ["threat" at position 0 fails because [child "technique" fails because ["technique" is required]]]'
    );
  });

  test('You can optionally send in an array of false positives', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'false_positives'>> & { false_positives: number[] }
      >({
        rule_id: 'rule-1',
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
        version: 1,
      }).error.message
    ).toEqual(
      'child "false_positives" fails because ["false_positives" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('You cannot set the risk_score to 101', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
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
        version: 1,
      }).error.message
    ).toEqual('child "risk_score" fails because ["risk_score" must be less than 101]');
  });

  test('You cannot set the risk_score to -1', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
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
        version: 1,
      }).error.message
    ).toEqual('child "risk_score" fails because ["risk_score" must be greater than -1]');
  });

  test('You can set the risk_score to 0', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can set the risk_score to 100', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
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
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('You can set meta to any object you want', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        Partial<Omit<PrepackagedRules, 'meta'> & { meta: string }>
      >({
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
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        meta: 'should not work',
        version: 1,
      }).error.message
    ).toEqual('child "meta" fails because ["meta" must be an object]');
  });

  test('You can omit the query string when filters are present', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        language: 'kuery',
        filters: [],
        max_signals: 1,
        version: 1,
      }).error
    ).toBeFalsy();
  });

  test('validates with timeline_id and timeline_title', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        version: 1,
        timeline_id: 'timeline-id',
        timeline_title: 'timeline-title',
      }).error
    ).toBeFalsy();
  });

  test('You cannot omit timeline_title when timeline_id is present', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        language: 'kuery',
        filters: [],
        max_signals: 1,
        version: 1,
        timeline_id: 'timeline-id',
      }).error.message
    ).toEqual('child "timeline_title" fails because ["timeline_title" is required]');
  });

  test('You cannot have a null value for timeline_title when timeline_id is present', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        language: 'kuery',
        filters: [],
        max_signals: 1,
        version: 1,
        timeline_id: 'timeline-id',
        timeline_title: null,
      }).error.message
    ).toEqual('child "timeline_title" fails because ["timeline_title" must be a string]');
  });

  test('You cannot have empty string for timeline_title when timeline_id is present', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        language: 'kuery',
        filters: [],
        max_signals: 1,
        version: 1,
        timeline_id: 'timeline-id',
        timeline_title: '',
      }).error.message
    ).toEqual('child "timeline_title" fails because ["timeline_title" is not allowed to be empty]');
  });

  test('You cannot have timeline_title with an empty timeline_id', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        language: 'kuery',
        filters: [],
        max_signals: 1,
        version: 1,
        timeline_id: '',
        timeline_title: 'some-title',
      }).error.message
    ).toEqual('child "timeline_id" fails because ["timeline_id" is not allowed to be empty]');
  });

  test('You cannot have timeline_title without timeline_id', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
        references: ['index-1'],
        language: 'kuery',
        filters: [],
        max_signals: 1,
        version: 1,
        timeline_title: 'some-title',
      }).error.message
    ).toEqual('child "timeline_title" fails because ["timeline_title" is not allowed]');
  });

  test('The default for "from" will be "now-6m"', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        index: ['auditbeat-*'],
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
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        index: ['auditbeat-*'],
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

  test('The default for "actions" will be an empty array', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        index: ['auditbeat-*'],
        name: 'some-name',
        severity: 'low',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).value.actions
    ).toEqual([]);
  });

  test('You cannot send in an array of actions that are missing "group"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'actions'>> & {
          actions: Array<Omit<RuleAlertAction, 'group'>>;
        }
      >({
        actions: [
          {
            id: 'id',
            action_type_id: 'actionTypeId',
            params: {},
          },
        ],
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
      }).error.message
    ).toEqual(
      'child "actions" fails because ["actions" at position 0 fails because [child "group" fails because ["group" is required]]]'
    );
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'actions'>> & {
          actions: Array<Omit<RuleAlertAction, 'id'>>;
        }
      >({
        actions: [
          {
            group: 'group',
            action_type_id: 'action_type_id',
            params: {},
          },
        ],
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
      }).error.message
    ).toEqual(
      'child "actions" fails because ["actions" at position 0 fails because [child "id" fails because ["id" is required]]]'
    );
  });

  test('You cannot send in an array of actions that are missing "action_type_id"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'actions'>> & {
          actions: Array<Omit<RuleAlertAction, 'action_type_id'>>;
        }
      >({
        actions: [
          {
            group: 'group',
            id: 'id',
            params: {},
          },
        ],
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
      }).error.message
    ).toEqual(
      'child "actions" fails because ["actions" at position 0 fails because [child "action_type_id" fails because ["action_type_id" is required]]]'
    );
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'actions'>> & {
          actions: Array<Omit<RuleAlertAction, 'params'>>;
        }
      >({
        actions: [
          {
            group: 'group',
            id: 'id',
            action_type_id: 'action_type_id',
          },
        ],
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
      }).error.message
    ).toEqual(
      'child "actions" fails because ["actions" at position 0 fails because [child "params" fails because ["params" is required]]]'
    );
  });

  test('You cannot send in an array of actions that are including "actionTypeId', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'actions'>> & {
          actions: AlertAction[];
        }
      >({
        actions: [
          {
            group: 'group',
            id: 'id',
            actionTypeId: 'actionTypeId',
            params: {},
          },
        ],
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
      }).error.message
    ).toEqual(
      'child "actions" fails because ["actions" at position 0 fails because [child "action_type_id" fails because ["action_type_id" is required]]]'
    );
  });

  test('The default for "throttle" will be null', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        index: ['auditbeat-*'],
        name: 'some-name',
        severity: 'low',
        type: 'query',
        references: ['index-1'],
        query: 'some query',
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).value.throttle
    ).toEqual(null);
  });

  describe('note', () => {
    test('You can set note to any string you want', () => {
      expect(
        addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 1,
          meta: {
            somethingMadeUp: { somethingElse: true },
          },
          note: '# test header',
          version: 1,
        }).error
      ).toBeFalsy();
    });

    test('You cannot create note as anything other than a string', () => {
      expect(
        addPrepackagedRulesSchema.validate<
          Partial<Omit<PrepackagedRules, 'note'> & { note: object }>
        >({
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
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 1,
          meta: {
            somethingMadeUp: { somethingElse: true },
          },
          note: {
            somethingMadeUp: { somethingElse: true },
          },
          version: 1,
        }).error.message
      ).toEqual('child "note" fails because ["note" must be a string]');
    });
  });

  // TODO: (LIST-FEATURE) We can enable this once we change the schema's to not be global per module but rather functions that can create the schema
  // on demand. Since they are per module, we have a an issue where the ENV variables do not take effect. It is better we change all the
  // schema's to be function calls to avoid global side effects or just wait until the feature is available. If you want to test this early,
  // you can remove the .skip and set your env variable of export ELASTIC_XPACK_SIEM_LISTS_FEATURE=true locally
  describe.skip('lists', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and lists] does validate', () => {
      expect(
        addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
          note: '# some markdown',
          version: 1,
          lists: [
            {
              field: 'source.ip',
              boolean_operator: 'and',
              values: [
                {
                  name: '127.0.0.1',
                  type: 'value',
                },
              ],
            },
            {
              field: 'host.name',
              boolean_operator: 'and not',
              values: [
                {
                  name: 'rock01',
                  type: 'value',
                },
                {
                  name: 'mothra',
                  type: 'value',
                },
              ],
            },
          ],
        }).error
      ).toBeFalsy();
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and empty lists] does validate', () => {
      expect(
        addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
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
          note: '# some markdown',
          lists: [],
          version: 1,
        }).error
      ).toBeFalsy();
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and invalid lists] does NOT validate', () => {
      expect(
        addPrepackagedRulesSchema.validate<Partial<Omit<PrepackagedRules, 'lists'>>>({
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
          note: '# some markdown',
          lists: [{ invalid_value: 'invalid value' }],
          version: 1,
        }).error.message
      ).toEqual(
        'child "lists" fails because ["lists" at position 0 fails because [child "field" fails because ["field" is required]]]'
      );
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and non-existent lists] does validate with empty lists', () => {
      expect(
        addPrepackagedRulesSchema.validate<Partial<Omit<PrepackagedRules, 'lists'>>>({
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
          note: '# some markdown',
          version: 1,
        }).value.lists
      ).toEqual([]);
    });
  });
});
