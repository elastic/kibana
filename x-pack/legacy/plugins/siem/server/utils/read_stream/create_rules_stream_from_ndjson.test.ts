/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Readable } from 'stream';
import {
  createRulesStreamFromNdJson,
  transformDataToNdjson,
} from './create_rules_stream_from_ndjson';
import { createPromiseFromStreams } from '../../../../../../../src/legacy/utils/streams';
import { ImportRuleAlertRest } from '../../lib/detection_engine/types';
import { BadRequestError } from '../../lib/detection_engine/errors/bad_request_error';
import { sampleRule } from '../../lib/detection_engine/signals/__mocks__/es_results';

type PromiseFromStreams = ImportRuleAlertRest | Error;

export const getOutputSample = (): Partial<ImportRuleAlertRest> => ({
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
});

export const getSampleAsNdjson = (sample: Partial<ImportRuleAlertRest>): string => {
  return `${JSON.stringify(sample)}\n`;
};

describe('create_rules_stream_from_ndjson', () => {
  describe('createRulesStreamFromNdJson', () => {
    test('transforms an ndjson stream into a stream of rule objects', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      expect(result).toEqual([
        {
          actions: [],
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
          enabled: true,
          false_positives: [],
          immutable: false,
          query: '',
          language: 'kuery',
          lists: [],
          max_signals: 100,
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
        {
          actions: [],
          rule_id: 'rule-2',
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
          enabled: true,
          false_positives: [],
          immutable: false,
          query: '',
          language: 'kuery',
          lists: [],
          max_signals: 100,
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
      ]);
    });

    test('returns error when ndjson stream is larger than limit', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1);
      await expect(
        createPromiseFromStreams<PromiseFromStreams[]>([ndJsonStream, ...rulesObjectsStream])
      ).rejects.toThrowError("Can't import more than 1 rules");
    });

    test('skips empty lines', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push('\n');
          this.push(getSampleAsNdjson(sample2));
          this.push('');
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      expect(result).toEqual([
        {
          actions: [],
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
          enabled: true,
          false_positives: [],
          immutable: false,
          query: '',
          language: 'kuery',
          max_signals: 100,
          tags: [],
          lists: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
        {
          actions: [],
          rule_id: 'rule-2',
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
          enabled: true,
          false_positives: [],
          immutable: false,
          query: '',
          language: 'kuery',
          max_signals: 100,
          lists: [],
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
      ]);
    });

    test('filters the export details entry from the stream', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
          this.push('{"exported_count":1,"missing_rules":[],"missing_rules_count":0}\n');
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      expect(result).toEqual([
        {
          actions: [],
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
          enabled: true,
          false_positives: [],
          immutable: false,
          query: '',
          language: 'kuery',
          max_signals: 100,
          lists: [],
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
        {
          actions: [],
          rule_id: 'rule-2',
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
          enabled: true,
          false_positives: [],
          immutable: false,
          query: '',
          language: 'kuery',
          max_signals: 100,
          lists: [],
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
      ]);
    });

    test('handles non parsable JSON strings and inserts the error as part of the return array', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push('{,,,,\n');
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const resultOrError = result as Error[];
      expect(resultOrError[0]).toEqual({
        actions: [],
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
        enabled: true,
        false_positives: [],
        immutable: false,
        query: '',
        language: 'kuery',
        max_signals: 100,
        lists: [],
        tags: [],
        threat: [],
        throttle: null,
        references: [],
        version: 1,
      });
      expect(resultOrError[1].message).toEqual('Unexpected token , in JSON at position 1');
      expect(resultOrError[2]).toEqual({
        actions: [],
        rule_id: 'rule-2',
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
        enabled: true,
        false_positives: [],
        immutable: false,
        query: '',
        language: 'kuery',
        max_signals: 100,
        lists: [],
        tags: [],
        threat: [],
        throttle: null,
        references: [],
        version: 1,
      });
    });

    test('handles non-validated data', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(`{}\n`);
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const resultOrError = result as BadRequestError[];
      expect(resultOrError[0]).toEqual({
        actions: [],
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
        enabled: true,
        false_positives: [],
        immutable: false,
        query: '',
        language: 'kuery',
        max_signals: 100,
        lists: [],
        tags: [],
        threat: [],
        throttle: null,
        references: [],
        version: 1,
      });
      expect(resultOrError[1].message).toEqual(
        'child "description" fails because ["description" is required]'
      );
      expect(resultOrError[2]).toEqual({
        actions: [],
        rule_id: 'rule-2',
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
        enabled: true,
        false_positives: [],
        immutable: false,
        query: '',
        language: 'kuery',
        max_signals: 100,
        lists: [],
        tags: [],
        threat: [],
        throttle: null,
        references: [],
        version: 1,
      });
    });

    test('non validated data is an instanceof BadRequestError', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(`{}\n`);
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const resultOrError = result as BadRequestError[];
      expect(resultOrError[1] instanceof BadRequestError).toEqual(true);
    });
  });

  describe('transformDataToNdjson', () => {
    test('if rules are empty it returns an empty string', () => {
      const ruleNdjson = transformDataToNdjson([]);
      expect(ruleNdjson).toEqual('');
    });

    test('single rule will transform with new line ending character for ndjson', () => {
      const rule = sampleRule();
      const ruleNdjson = transformDataToNdjson([rule]);
      expect(ruleNdjson.endsWith('\n')).toBe(true);
    });

    test('multiple rules will transform with two new line ending characters for ndjson', () => {
      const result1 = sampleRule();
      const result2 = sampleRule();
      result2.id = 'some other id';
      result2.rule_id = 'some other id';
      result2.name = 'Some other rule';

      const ruleNdjson = transformDataToNdjson([result1, result2]);
      // this is how we count characters in JavaScript :-)
      const count = ruleNdjson.split('\n').length - 1;
      expect(count).toBe(2);
    });

    test('you can parse two rules back out without errors', () => {
      const result1 = sampleRule();
      const result2 = sampleRule();
      result2.id = 'some other id';
      result2.rule_id = 'some other id';
      result2.name = 'Some other rule';

      const ruleNdjson = transformDataToNdjson([result1, result2]);
      const ruleStrings = ruleNdjson.split('\n');
      const reParsed1 = JSON.parse(ruleStrings[0]);
      const reParsed2 = JSON.parse(ruleStrings[1]);
      expect(reParsed1).toEqual(result1);
      expect(reParsed2).toEqual(result2);
    });
  });
});
