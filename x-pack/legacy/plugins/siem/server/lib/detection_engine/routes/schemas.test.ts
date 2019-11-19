/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createSignalsSchema,
  updateSignalSchema,
  findSignalsSchema,
  querySignalSchema,
} from './schemas';
import {
  SignalAlertParamsRest,
  FindParamsRest,
  UpdateSignalAlertParamsRest,
} from '../alerts/types';

describe('schemas', () => {
  describe('create signals schema', () => {
    test('empty objects do not validate', () => {
      expect(createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({}).error).toBeTruthy();
    });

    test('made up values do not validate', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest & { madeUp: string }>>({
          madeUp: 'hi',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id] does not validate', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description] does not validate', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
          description: 'some description',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description, from] does not validate', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
          description: 'some description',
          from: 'now-5m',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description, from, to] does not validate', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
          description: 'some description',
          from: 'now-5m',
          to: 'now',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description, from, to, name] does not validate', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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

    test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does validate', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter] does validate', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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

    test('If filter type is set then filter is required', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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
          query: 'some query value',
        }).error
      ).toBeTruthy();
    });

    test('If filter type is set then language is not allowed', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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
          language: 'kuery',
        }).error
      ).toBeTruthy();
    });

    test('If filter type is set then filters are not allowed', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
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
          filters: [],
        }).error
      ).toBeTruthy();
    });

    test('allows references to be sent as valid', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<
          Partial<Omit<SignalAlertParamsRest, 'references'>> & { references: number[] }
        >({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<
          Partial<Omit<SignalAlertParamsRest, 'index'>> & { index: number[] }
        >({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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

    test('saved_query type cannot have filters with it', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
      ).toBeTruthy();
    });

    test('saved_query type cannot have filter with it', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<
          Partial<Omit<SignalAlertParamsRest, 'tags'>> & { tags: number[] }
        >({
          rule_id: 'rule-1',
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
        }).error
      ).toBeTruthy();
    });

    test('You can optionally send in an array of false positives', () => {
      expect(
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<
          Partial<Omit<SignalAlertParamsRest, 'false_positives'>> & { false_positives: number[] }
        >({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<Partial<SignalAlertParamsRest>>({
          rule_id: 'rule-1',
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
        createSignalsSchema.validate<
          Partial<Omit<SignalAlertParamsRest, 'immutable'>> & { immutable: number }
        >({
          rule_id: 'rule-1',
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
  });

  describe('update signals schema', () => {
    test('empty objects do not validate as they require at least id or rule_id', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({}).error
      ).toBeTruthy();
    });

    test('made up values do not validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest & { madeUp: string }>>({
          madeUp: 'hi',
        }).error
      ).toBeTruthy();
    });

    test('[id] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          id: 'rule-1',
        }).error
      ).toBeFalsy();
    });

    test('[rule_id] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          rule_id: 'rule-1',
        }).error
      ).toBeFalsy();
    });

    test('[id and rule_id] does not validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          id: 'id-1',
          rule_id: 'rule-1',
        }).error
      ).toBeTruthy();
    });

    test('[rule_id, description] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          rule_id: 'rule-1',
          description: 'some description',
        }).error
      ).toBeFalsy();
    });

    test('[id, description] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          id: 'rule-1',
          description: 'some description',
        }).error
      ).toBeFalsy();
    });

    test('[rule_id, description, from] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          rule_id: 'rule-1',
          description: 'some description',
          from: 'now-5m',
        }).error
      ).toBeFalsy();
    });

    test('[id, description, from] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          id: 'rule-1',
          description: 'some description',
          from: 'now-5m',
        }).error
      ).toBeFalsy();
    });

    test('[rule_id, description, from, to] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          rule_id: 'rule-1',
          description: 'some description',
          from: 'now-5m',
          to: 'now',
        }).error
      ).toBeFalsy();
    });

    test('[id, description, from, to] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
          id: 'rule-1',
          description: 'some description',
          from: 'now-5m',
          to: 'now',
        }).error
      ).toBeFalsy();
    });

    test('[rule_id, description, from, to, name] does validate', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<
          Partial<Omit<UpdateSignalAlertParamsRest, 'references'>> & { references: number[] }
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
        updateSignalSchema.validate<
          Partial<Omit<UpdateSignalAlertParamsRest, 'index'>> & { index: number[] }
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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

    test('saved_query type cannot have filters with it', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
      ).toBeTruthy();
    });

    test('saved_query type cannot have filter with it', () => {
      expect(
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
        updateSignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({
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
  });

  describe('find signals schema', () => {
    test('empty objects do validate', () => {
      expect(findSignalsSchema.validate<Partial<FindParamsRest>>({}).error).toBeFalsy();
    });

    test('all values validate', () => {
      expect(
        findSignalsSchema.validate<Partial<FindParamsRest>>({
          per_page: 5,
          page: 1,
          sort_field: 'some field',
          fields: ['field 1', 'field 2'],
        }).error
      ).toBeFalsy();
    });

    test('made up parameters do not validate', () => {
      expect(
        findSignalsSchema.validate<Partial<FindParamsRest & { madeUp: string }>>({
          madeUp: 'hi',
        }).error
      ).toBeTruthy();
    });

    test('per_page validates', () => {
      expect(
        findSignalsSchema.validate<Partial<FindParamsRest>>({ per_page: 5 }).error
      ).toBeFalsy();
    });

    test('page validates', () => {
      expect(
        findSignalsSchema.validate<Partial<FindParamsRest>>({ page: 5 }).error
      ).toBeFalsy();
    });

    test('sort_field validates', () => {
      expect(
        findSignalsSchema.validate<Partial<FindParamsRest>>({ sort_field: 'some value' }).error
      ).toBeFalsy();
    });

    test('fields validates with a string', () => {
      expect(
        findSignalsSchema.validate<Partial<FindParamsRest>>({ fields: ['some value'] }).error
      ).toBeFalsy();
    });

    test('fields validates with multiple strings', () => {
      expect(
        findSignalsSchema.validate<Partial<FindParamsRest>>({
          fields: ['some value 1', 'some value 2'],
        }).error
      ).toBeFalsy();
    });

    test('fields does not validate with a number', () => {
      expect(
        findSignalsSchema.validate<Partial<Omit<FindParamsRest, 'fields'>> & { fields: number[] }>({
          fields: [5],
        }).error
      ).toBeTruthy();
    });

    test('per page has a default of 20', () => {
      expect(findSignalsSchema.validate<Partial<FindParamsRest>>({}).value.per_page).toEqual(20);
    });

    test('page has a default of 1', () => {
      expect(findSignalsSchema.validate<Partial<FindParamsRest>>({}).value.page).toEqual(1);
    });
  });

  describe('querySignalSchema', () => {
    test('empty objects do not validate', () => {
      expect(
        querySignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({}).error
      ).toBeTruthy();
    });

    test('both rule_id and id being supplied dot not validate', () => {
      expect(
        querySignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({ rule_id: '1', id: '1' })
          .error
      ).toBeTruthy();
    });

    test('only id validates', () => {
      expect(
        querySignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({ id: '1' }).error
      ).toBeFalsy();
    });

    test('only rule_id validates', () => {
      expect(
        querySignalSchema.validate<Partial<UpdateSignalAlertParamsRest>>({ rule_id: '1' }).error
      ).toBeFalsy();
    });
  });
});
