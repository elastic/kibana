/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  importRulesSchema,
  importRulesQuerySchema,
  importRulesPayloadSchema,
} from './import_rules_schema';
import { ThreatParams, ImportRuleAlertRest } from '../../types';
import { ImportRulesRequest } from '../../rules/types';

describe('import rules schema', () => {
  describe('importRulesSchema', () => {
    test('empty objects do not validate', () => {
      expect(importRulesSchema.validate<Partial<ImportRuleAlertRest>>({}).error).toBeTruthy();
    });

    test('made up values do not validate', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest & { madeUp: string }>>({
          madeUp: 'hi',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id] does not validate', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description] does not validate', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          description: 'some description',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description, from] does not validate', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          description: 'some description',
          from: 'now-5m',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description, from, to] does not validate', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          description: 'some description',
          from: 'now-5m',
          to: 'now',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description, from, to, name] does not validate', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<
          Partial<Omit<ImportRuleAlertRest, 'references'>> & { references: number[] }
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
        importRulesSchema.validate<
          Partial<Omit<ImportRuleAlertRest, 'index'>> & { index: number[] }
        >({
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
        }).error.message
      ).toEqual(
        'child "index" fails because ["index" at position 0 fails because ["0" must be a string]]'
      );
    });

    test('defaults interval to 5 min', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<
          Partial<Omit<ImportRuleAlertRest, 'filters'> & { filters: string }>
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<Omit<ImportRuleAlertRest, 'tags'>> & { tags: number[] }>(
          {
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
          }
        ).error.message
      ).toEqual(
        'child "tags" fails because ["tags" at position 0 fails because ["0" must be a string]]'
      );
    });

    test('You cannot send in an array of threat that are missing "framework"', () => {
      expect(
        importRulesSchema.validate<
          Partial<Omit<ImportRuleAlertRest, 'threat'>> & {
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
        importRulesSchema.validate<
          Partial<Omit<ImportRuleAlertRest, 'threat'>> & {
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
        importRulesSchema.validate<
          Partial<Omit<ImportRuleAlertRest, 'threat'>> & {
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<
          Partial<Omit<ImportRuleAlertRest, 'false_positives'>> & { false_positives: number[] }
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

    test('You can optionally set the immutable to be false', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          immutable: false,
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

    test('You cannnot set immutable to be true', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
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
        }).error.message
      ).toEqual('child "immutable" fails because ["immutable" must be one of [false]]');
    });

    test('You cannot set the immutable to be a number', () => {
      expect(
        importRulesSchema.validate<
          Partial<Omit<ImportRuleAlertRest, 'immutable'>> & { immutable: number }
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
      ).toEqual('child "immutable" fails because ["immutable" must be a boolean]');
    });

    test('You cannot set the risk_score to 101', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 101,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          immutable: false,
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: -1,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          immutable: false,
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 0,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          immutable: false,
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 100,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          immutable: false,
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          immutable: false,
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
        importRulesSchema.validate<Partial<Omit<ImportRuleAlertRest, 'meta'> & { meta: string }>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          immutable: false,
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          immutable: false,
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
      ).toEqual(
        'child "timeline_title" fails because ["timeline_title" is not allowed to be empty]'
      );
    });

    test('You cannot have timeline_title with an empty timeline_id', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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

    test('rule_id is required and you cannot get by with just id', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
          id: 'rule-1',
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
        }).error.message
      ).toEqual('child "rule_id" fails because ["rule_id" is required]');
    });

    test('it validates with created_at, updated_at, created_by, updated_by values', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
          created_at: '2020-01-09T06:15:24.749Z',
          updated_at: '2020-01-09T06:15:24.749Z',
          created_by: 'Braden Hassanabad',
          updated_by: 'Evan Hassanabad',
        }).error
      ).toBeFalsy();
    });

    test('it does not validate with epoch strings for created_at', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
          created_at: '1578550728650',
          updated_at: '2020-01-09T06:15:24.749Z',
          created_by: 'Braden Hassanabad',
          updated_by: 'Evan Hassanabad',
        }).error.message
      ).toEqual('child "created_at" fails because ["created_at" must be a valid ISO 8601 date]');
    });

    test('it does not validate with epoch strings for updated_at', () => {
      expect(
        importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
          created_at: '2020-01-09T06:15:24.749Z',
          updated_at: '1578550728650',
          created_by: 'Braden Hassanabad',
          updated_by: 'Evan Hassanabad',
        }).error.message
      ).toEqual('child "updated_at" fails because ["updated_at" must be a valid ISO 8601 date]');
    });
  });

  describe('importRulesQuerySchema', () => {
    test('overwrite gets a default value of false', () => {
      expect(
        importRulesQuerySchema.validate<Partial<ImportRulesRequest['query']>>({}).value.overwrite
      ).toEqual(false);
    });

    test('overwrite validates with a boolean true', () => {
      expect(
        importRulesQuerySchema.validate<Partial<ImportRulesRequest['query']>>({
          overwrite: true,
        }).error
      ).toBeFalsy();
    });

    test('overwrite does not validate with a weird string', () => {
      expect(
        importRulesQuerySchema.validate<
          Partial<
            Omit<ImportRulesRequest['query'], 'overwrite'> & {
              overwrite: string;
            }
          >
        >({
          overwrite: 'blah',
        }).error
      ).toBeTruthy();
    });
  });

  describe('importRulesPayloadSchema', () => {
    test('does not validate with an empty object', () => {
      expect(importRulesPayloadSchema.validate({}).error).toBeTruthy();
    });

    test('does validate with a file object', () => {
      expect(importRulesPayloadSchema.validate({ file: {} }).error).toBeFalsy();
    });
  });

  test('The default for "from" will be "now-6m"', () => {
    expect(
      importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
      importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        references: ['index-1'],
        language: 'kuery',
        max_signals: 1,
        version: 1,
      }).value.to
    ).toEqual('now');
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    expect(
      importRulesSchema.validate<Partial<ImportRuleAlertRest>>({
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
