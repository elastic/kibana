/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DateProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Date Processor', () => {
  apiTest(
    'should parse a date and set it to @timestamp',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-date';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'log.time',
            formats: ['ISO8601'],
          } as DateProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [{ log: { time: '2025-01-01T12:34:56.789Z' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]['@timestamp']).toBe('2025-01-01T12:34:56.789Z');
    }
  );

  // This test fails in Serverless which is a different behavior then Stateful and needs to be checked
  apiTest(
    'should parse a date with multiple formats',
    { tag: ['@ess'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-date-multiple-formats';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            to: 'event.created_date',
            formats: ['dd/MM/yyyy:HH:mm:ss', 'ISO8601'],
          } as DateProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        { event: { created: '01/01/2025:12:34:56' } },
        { event: { created: '2025-01-02T12:34:56.789Z' } },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documentsOrdered[0]['event.created_date']).toBe('2025-01-01T12:34:56.000Z');
      expect(esqlResult.documentsOrdered[1]['event.created_date']).toBe('2025-01-02T12:34:56.789Z');
    }
  );

  apiTest(
    'should use a different to field',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-date-to-field';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'log.time',
            to: 'custom.time',
            formats: ['ISO8601'],
          } as DateProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [{ log: { time: '2025-01-01T12:34:56.789Z' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]['custom.time']).toBe('2025-01-01T12:34:56.789Z');
    }
  );

  apiTest(
    'should use a different output format',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-date-output-format';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'log.time',
            formats: ['ISO8601'],
            output_format: 'yyyy/MM/dd',
          } as DateProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [{ log: { time: '2025-01-01T12:34:56.789Z' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]['@timestamp']).toBe('2025/01/01');
    }
  );

  apiTest(
    'should not parse a date when where is false',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-date-where-false';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'log.time',
            formats: ['ISO8601'],
            where: {
              field: 'attributes.should_exist',
              exists: true,
            },
          } as DateProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);

      const mappingDoc = { '@timestamp': '2025-01-01T12:32:54.123Z' }; // Needed to satisfy ES|QL which needs all operand columns pre-mapped
      const docs = [
        mappingDoc,
        { attributes: { should_exist: 'YES' }, log: { time: '2025-01-01T12:34:56.789Z' } },
        { attributes: { size: 2048 }, log: { time: '2025-01-02T12:34:56.789Z' } },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documentsOrdered[1]['@timestamp']).toBe('2025-01-01T12:34:56.789Z');
      expect(esqlResult.documentsOrdered[2]['@timestamp']).toBeNull();
    }
  );

  apiTest(
    'should leave source unchanged in case of error',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-date-fail';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'log.time',
            formats: ['yyyy/MM/dd'],
          } as DateProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [{ log: { time: '01-01-2025' } }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]['log.time']).toBe('01-01-2025');
      expect(esqlResult.documents[0]['@timestamp']).toBeNull();
    }
  );

  apiTest(
    'should reject Mustache template syntax {{ and {{{',
    { tag: ['@ess', '@svlOblt'] },
    async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: '{{date.field}}',
            to: '{{{parsed.field}}}',
            formats: ['ISO8601'],
          } as DateProcessor,
        ],
      };

      // Should throw validation error for Mustache templates
      expect(() => transpile(streamlangDSL)).toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed'
      );
    }
  );
});
