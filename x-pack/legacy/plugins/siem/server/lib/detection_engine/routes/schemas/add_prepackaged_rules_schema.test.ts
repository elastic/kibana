/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThreatParams, PrepackagedRules } from '../../types';
import { addPrepackagedRulesSchema } from './add_prepackaged_rules_schema';

describe('add prepackaged rules schema', () => {
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

  test('You can send in an empty array to threats', () => {
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
        threats: [],
        version: 1,
      }).error
    ).toBeFalsy();
  });
  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, version, threats] does validate', () => {
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

  test('immutable cannot be false', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        immutable: false,
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        query: 'some-query',
        language: 'kuery',
        version: 1,
      }).error.message
    ).toEqual('child "immutable" fails because ["immutable" must be one of [true]]');
  });

  test('immutable can be true', () => {
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
      }).error
    ).toBeFalsy();
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

  test('You cannot send in an array of threats that are missing "framework"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'threats'>> & {
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
        severity: 'low',
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
      }).error.message
    ).toEqual(
      'child "threats" fails because ["threats" at position 0 fails because [child "framework" fails because ["framework" is required]]]'
    );
  });

  test('You cannot send in an array of threats that are missing "tactic"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'threats'>> & {
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
        severity: 'low',
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
      }).error.message
    ).toEqual(
      'child "threats" fails because ["threats" at position 0 fails because [child "tactic" fails because ["tactic" is required]]]'
    );
  });

  test('You cannot send in an array of threats that are missing "techniques"', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'threats'>> & {
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
        severity: 'low',
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
      }).error.message
    ).toEqual(
      'child "threats" fails because ["threats" at position 0 fails because [child "techniques" fails because ["techniques" is required]]]'
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

  test('You can optionally set the immutable to be true', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
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

  test('You cannot set the immutable to be a number', () => {
    expect(
      addPrepackagedRulesSchema.validate<
        Partial<Omit<PrepackagedRules, 'immutable'>> & { immutable: number }
      >({
        rule_id: 'rule-1',
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
        version: 1,
      }).error.message
    ).toEqual('child "immutable" fails because ["immutable" must be a boolean]');
  });

  test('You cannot set the risk_score to 101', () => {
    expect(
      addPrepackagedRulesSchema.validate<Partial<PrepackagedRules>>({
        rule_id: 'rule-1',
        risk_score: 101,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
        immutable: true,
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
