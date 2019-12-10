/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createRulesSchema,
  updateRulesSchema,
  findRulesSchema,
  queryRulesSchema,
  setSignalsStatusSchema,
} from './schemas';
import {
  RuleAlertParamsRest,
  FindParamsRest,
  UpdateRuleAlertParamsRest,
  ThreatParams,
  SignalsRestParams,
} from '../alerts/types';

describe('schemas', () => {
  describe('create rules schema', () => {
    test('empty objects do not validate', () => {
      expect(createRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({}).error).toBeTruthy();
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
          severity: 'severity',
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
          severity: 'severity',
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
          severity: 'severity',
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
          severity: 'severity',
          type: 'query',
          interval: '5m',
          index: ['index-1'],
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description, from, to, name, severity, type, query, index, interval] does not validate', () => {
      expect(
        createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
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
        }).error
      ).toBeTruthy();
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
          severity: 'severity',
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
          severity: 'severity',
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
          severity: 'severity',
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
          severity: 'severity',
          interval: '5m',
          type: 'filter',
          filter: {},
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
          severity: 'severity',
          interval: '5m',
          type: 'filter',
          filter: {},
        }).error
      ).toBeFalsy();
    });
    test('You can send in an empty array to threats', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'query',
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 1,
          threats: [],
        }).error
      ).toBeFalsy();
    });
    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threats] does validate', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'filter',
          filter: {},
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
        }).error
      ).toBeFalsy();
    });

    test('If filter type is set then filter is required', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'filter',
        }).error
      ).toBeTruthy();
    });

    test('If filter type is set then query is not allowed', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'filter',
          filter: {},
          query: 'some query value',
        }).error
      ).toBeTruthy();
    });

    test('If filter type is set then language is not allowed', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'filter',
          filter: {},
          language: 'kuery',
        }).error
      ).toBeTruthy();
    });

    test('If filter type is set then filters are not allowed', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'filter',
          filter: {},
          filters: [],
        }).error
      ).toBeTruthy();
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
          severity: 'severity',
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
          severity: 'severity',
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
        createRulesSchema.validate<
          Partial<Omit<RuleAlertParamsRest, 'index'>> & { index: number[] }
        >({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
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
        }).error
      ).toBeTruthy();
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
          severity: 'severity',
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
          severity: 'severity',
          interval: '5m',
          type: 'query',
        }).value.max_signals
      ).toEqual(100);
    });

    test('filter and filters cannot exist together', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'query',
          filter: {},
          filters: [],
        }).error
      ).toBeTruthy();
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
          severity: 'severity',
          interval: '5m',
          type: 'saved_query',
        }).error
      ).toBeTruthy();
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
          severity: 'severity',
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
          severity: 'severity',
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
          severity: 'severity',
          interval: '5m',
          type: 'saved_query',
          saved_id: 'some id',
          filters: 'some string',
        }).error
      ).toBeTruthy();
    });

    test('saved_query type cannot have filter with it', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'saved_query',
          saved_id: 'some id',
          filter: {},
        }).error
      ).toBeTruthy();
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
        createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
          rule_id: 'rule-1',
          risk_score: 50,
          output_index: '.siem-signals',
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
        createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
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
          references: ['index-1'],
          query: 'some query',
          language: 'something-made-up',
        }).error
      ).toBeTruthy();
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
        createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
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
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 0,
        }).error
      ).toBeTruthy();
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
          severity: 'severity',
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
        createRulesSchema.validate<Partial<Omit<RuleAlertParamsRest, 'tags'>> & { tags: number[] }>(
          {
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
            references: ['index-1'],
            query: 'some query',
            language: 'kuery',
            max_signals: 1,
            tags: [0, 1, 2],
          }
        ).error
      ).toBeTruthy();
    });

    test('You cannot send in an array of threats that are missing "framework"', () => {
      expect(
        createRulesSchema.validate<
          Partial<Omit<RuleAlertParamsRest, 'threats'>> & {
            threats: Array<Partial<Omit<ThreatParams, 'framework'>>>;
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
    test('You cannot send in an array of threats that are missing "tactic"', () => {
      expect(
        createRulesSchema.validate<
          Partial<Omit<RuleAlertParamsRest, 'threats'>> & {
            threats: Array<Partial<Omit<ThreatParams, 'tactic'>>>;
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
    test('You cannot send in an array of threats that are missing "techniques"', () => {
      expect(
        createRulesSchema.validate<
          Partial<Omit<RuleAlertParamsRest, 'threats'>> & {
            threats: Array<Partial<Omit<ThreatParams, 'technique'>>>;
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
        }).error
      ).toBeTruthy();
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
          severity: 'severity',
          interval: '5m',
          type: 'query',
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 1,
        }).error
      ).toBeTruthy();
    });

    test('You can optionally set the immutable to be true', () => {
      expect(
        createRulesSchema.validate<Partial<RuleAlertParamsRest>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
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
        }).error
      ).toBeFalsy();
    });

    test('You cannot set the immutable to be a number', () => {
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
          severity: 'severity',
          interval: '5m',
          type: 'query',
          references: ['index-1'],
          query: 'some query',
          language: 'kuery',
          max_signals: 1,
        }).error
      ).toBeTruthy();
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
        }).error
      ).toBeTruthy();
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
        }).error
      ).toBeTruthy();
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
        }).error
      ).toBeTruthy();
    });

    test('You can have an empty query string when filters are present', () => {
      expect(
        createRulesSchema.validate<Partial<Omit<RuleAlertParamsRest, 'meta'> & { meta: string }>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
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
          query: '',
          language: 'kuery',
          filters: [],
          max_signals: 1,
        }).error
      ).toBeFalsy();
    });

    test('You can omit the query string when filters are present', () => {
      expect(
        createRulesSchema.validate<Partial<Omit<RuleAlertParamsRest, 'meta'> & { meta: string }>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
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
        }).error
      ).toBeFalsy();
    });

    test('query string defaults to empty string when present with filters', () => {
      expect(
        createRulesSchema.validate<Partial<Omit<RuleAlertParamsRest, 'meta'> & { meta: string }>>({
          rule_id: 'rule-1',
          output_index: '.siem-signals',
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
        }).value.query
      ).toEqual('');
    });
  });

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
          type: 'filter',
          filter: {},
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
          type: 'filter',
          filter: {},
        }).error
      ).toBeFalsy();
    });

    test('If filter type is set then filter is still not required', () => {
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
          type: 'filter',
        }).error
      ).toBeFalsy();
    });

    test('If filter type is set then query is not allowed', () => {
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
          type: 'filter',
          filter: {},
          query: 'some query value',
        }).error
      ).toBeTruthy();
    });

    test('If filter type is set then language is not allowed', () => {
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
          type: 'filter',
          filter: {},
          language: 'kuery',
        }).error
      ).toBeTruthy();
    });

    test('If filter type is set then filters are not allowed', () => {
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
          type: 'filter',
          filter: {},
          filters: [],
        }).error
      ).toBeTruthy();
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

    test('filter and filters cannot exist together', () => {
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
          filter: {},
          filters: [],
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

    test('saved_query type cannot have filter with it', () => {
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
          filter: {},
        }).error
      ).toBeTruthy();
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
  });

  describe('find rules schema', () => {
    test('empty objects do validate', () => {
      expect(findRulesSchema.validate<Partial<FindParamsRest>>({}).error).toBeFalsy();
    });

    test('all values validate', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({
          per_page: 5,
          page: 1,
          sort_field: 'some field',
          fields: ['field 1', 'field 2'],
          filter: 'some filter',
          sort_order: 'asc',
        }).error
      ).toBeFalsy();
    });

    test('made up parameters do not validate', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest & { madeUp: string }>>({
          madeUp: 'hi',
        }).error
      ).toBeTruthy();
    });

    test('per_page validates', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({ per_page: 5 }).error
      ).toBeFalsy();
    });

    test('page validates', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({ page: 5 }).error
      ).toBeFalsy();
    });

    test('sort_field validates', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({ sort_field: 'some value' }).error
      ).toBeFalsy();
    });

    test('fields validates with a string', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({ fields: ['some value'] }).error
      ).toBeFalsy();
    });

    test('fields validates with multiple strings', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({
          fields: ['some value 1', 'some value 2'],
        }).error
      ).toBeFalsy();
    });

    test('fields does not validate with a number', () => {
      expect(
        findRulesSchema.validate<Partial<Omit<FindParamsRest, 'fields'>> & { fields: number[] }>({
          fields: [5],
        }).error
      ).toBeTruthy();
    });

    test('per page has a default of 20', () => {
      expect(findRulesSchema.validate<Partial<FindParamsRest>>({}).value.per_page).toEqual(20);
    });

    test('page has a default of 1', () => {
      expect(findRulesSchema.validate<Partial<FindParamsRest>>({}).value.page).toEqual(1);
    });

    test('filter works with a string', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({
          filter: 'some value 1',
        }).error
      ).toBeFalsy();
    });

    test('filter does not work with a number', () => {
      expect(
        findRulesSchema.validate<Partial<Omit<FindParamsRest, 'filter'>> & { filter: number }>({
          filter: 5,
        }).error
      ).toBeTruthy();
    });

    test('sort_order requires sort_field to work', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({
          sort_order: 'asc',
        }).error
      ).toBeTruthy();
    });

    test('sort_order and sort_field validate together', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({
          sort_order: 'asc',
          sort_field: 'some field',
        }).error
      ).toBeFalsy();
    });

    test('sort_order validates with desc and sort_field', () => {
      expect(
        findRulesSchema.validate<Partial<FindParamsRest>>({
          sort_order: 'desc',
          sort_field: 'some field',
        }).error
      ).toBeFalsy();
    });

    test('sort_order does not validate with a string other than asc and desc', () => {
      expect(
        findRulesSchema.validate<
          Partial<Omit<FindParamsRest, 'sort_order'>> & { sort_order: string }
        >({
          sort_order: 'some other string',
          sort_field: 'some field',
        }).error
      ).toBeTruthy();
    });
  });

  describe('queryRulesSchema', () => {
    test('empty objects do not validate', () => {
      expect(queryRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({}).error).toBeTruthy();
    });

    test('both rule_id and id being supplied dot not validate', () => {
      expect(
        queryRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({ rule_id: '1', id: '1' })
          .error
      ).toBeTruthy();
    });

    test('only id validates', () => {
      expect(
        queryRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({ id: '1' }).error
      ).toBeFalsy();
    });

    test('only rule_id validates', () => {
      expect(
        queryRulesSchema.validate<Partial<UpdateRuleAlertParamsRest>>({ rule_id: '1' }).error
      ).toBeFalsy();
    });
  });

  describe('set signal status schema', () => {
    test('signal_ids and status is valid', () => {
      expect(
        setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
          signal_ids: ['somefakeid'],
          status: 'open',
        }).error
      ).toBeFalsy();
    });

    test('query and status is valid', () => {
      expect(
        setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
          query: {},
          status: 'open',
        }).error
      ).toBeFalsy();
    });

    test('signal_ids and missing status is invalid', () => {
      expect(
        setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
          signal_ids: ['somefakeid'],
        }).error
      ).toBeTruthy();
    });

    test('query and missing status is invalid', () => {
      expect(
        setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
          query: {},
        }).error
      ).toBeTruthy();
    });

    test('status is present but query or signal_ids is missing is invalid', () => {
      expect(
        setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
          status: 'closed',
        }).error
      ).toBeTruthy();
    });

    test('signal_ids is present but status has wrong value', () => {
      expect(
        setSignalsStatusSchema.validate<
          Partial<
            Omit<SignalsRestParams, 'status'> & {
              status: string;
            }
          >
        >({
          status: 'fakeVal',
        }).error
      ).toBeTruthy();
    });
  });
});
