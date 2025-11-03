/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DateProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Date Processor', () => {
  // *** Compatible Cases ***
  apiTest(
    'should parse a date with a single format',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'log.time',
            formats: ['ISO8601'],
          } as DateProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ log: { time: '2025-01-01T12:34:56.789Z' } }];
      await testBed.ingest('ingest-date-single-format', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-date-single-format');

      await testBed.ingest('esql-date-single-format', docs);
      const esqlResult = await esql.queryOnIndex('esql-date-single-format', query);

      expect(ingestResult[0]['@timestamp']).toBe('2025-01-01T12:34:56.789Z');
      expect(esqlResult.documentsOrdered[0]['@timestamp']).toBe('2025-01-01T12:34:56.789Z');
    }
  );

  // This test fails in Serverless which is a different behavior then Stateful and needs to be checked
  apiTest(
    'should parse a date with multiple formats',
    { tag: ['@ess'] },
    async ({ testBed, esql }) => {
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

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        { event: { created: '01/01/2025:12:34:56' } },
        { event: { created: '2025-01-02T12:34:56.789Z' } },
      ];
      await testBed.ingest('ingest-date-multiple-formats', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-date-multiple-formats');

      await testBed.ingest('esql-date-multiple-formats', docs);
      const esqlResult = await esql.queryOnIndex('esql-date-multiple-formats', query);

      expect(ingestResult[0].event.created_date).toBe('2025-01-01T12:34:56.000Z');
      expect(ingestResult[1].event.created_date).toBe('2025-01-02T12:34:56.789Z');
      expect(esqlResult.documentsOrdered[0]['event.created_date']).toBe('2025-01-01T12:34:56.000Z');
      expect(esqlResult.documentsOrdered[1]['event.created_date']).toBe('2025-01-02T12:34:56.789Z');
    }
  );

  apiTest(
    'should use a different output format',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
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

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ log: { time: '2025-01-01T12:34:56.789Z' } }];
      await testBed.ingest('ingest-date-output-format', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-date-output-format');

      await testBed.ingest('esql-date-output-format', docs);
      const esqlResult = await esql.queryOnIndex('esql-date-output-format', query);

      expect(ingestResult[0]['@timestamp']).toBe('2025/01/01');
      expect(esqlResult.documentsOrdered[0]['@timestamp']).toBe('2025/01/01');
    }
  );

  // Template validation tests - both transpilers should consistently REJECT Mustache templates
  [
    {
      templateType: '{{ }}',
      from: '{{template_from}}',
      to: '{{template_to}}',
    },
    {
      templateType: '{{{ }}}',
      from: '{{{template_from}}}',
      to: '{{{template_to}}}',
    },
  ].forEach(({ templateType, from, to }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      { tag: ['@ess', '@svlOblt'] },
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'date',
              from,
              to,
              formats: ['ISO8601'],
              output_format: 'yyyy/MM/dd',
            } as DateProcessor,
          ],
        };

        // Both transpilers should throw validation errors for Mustache templates
        expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed'
        );
        expect(() => transpileEsql(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed'
        );
      }
    );
  });

  // This test fails in Serverless which is a different behavior then Stateful and needs to be checked
  apiTest(
    'should parse the first matching among a list of input formats',
    { tag: ['@ess'] },
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'log.timestamp',
            to: 'parsed_timestamp',
            formats: ['yyyy-MM-dd HH:mm:ss', 'dd/MM/yyyy HH:mm:ss', 'ISO8601', 'epoch_millis'],
          } as DateProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      // Test documents with different formats that should match different patterns in the list
      const docs = [
        { log: { timestamp: '31/12/2024 23:59:59' } }, // Should match 2nd format: dd/MM/yyyy HH:mm:ss
        { log: { timestamp: '2025-01-01 12:34:56' } }, // Should match 1st format: yyyy-MM-dd HH:mm:ss
        { log: { timestamp: '2025-01-15T08:30:00.123Z' } }, // Should match 3rd format: ISO8601
        { log: { timestamp: '1704067200000' } }, // Should match 4th format: epoch_millis (2024-01-01 00:00:00 UTC)
      ];

      await testBed.ingest('ingest-date-multiple-patterns', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-date-multiple-patterns');

      await testBed.ingest('esql-date-multiple-patterns', docs);
      const esqlResult = await esql.queryOnIndex('esql-date-multiple-patterns', query);

      // Verify that all formats were parsed correctly by both transpilers
      expect(ingestResult[0].parsed_timestamp).toBe('2024-12-31T23:59:59.000Z'); // dd/MM/yyyy format
      expect(ingestResult[1].parsed_timestamp).toBe('2025-01-01T12:34:56.000Z'); // yyyy-MM-dd format
      expect(ingestResult[2].parsed_timestamp).toBe('2025-01-15T08:30:00.123Z'); // ISO8601 format
      expect(ingestResult[3].parsed_timestamp).toBe('2024-01-01T00:00:00.000Z'); // epoch_millis format

      expect(esqlResult.documentsOrdered[0].parsed_timestamp).toBe('2024-12-31T23:59:59.000Z');
      expect(esqlResult.documentsOrdered[1].parsed_timestamp).toBe('2025-01-01T12:34:56.000Z');
      expect(esqlResult.documentsOrdered[2].parsed_timestamp).toBe('2025-01-15T08:30:00.123Z');
      expect(esqlResult.documentsOrdered[3].parsed_timestamp).toBe('2024-01-01T00:00:00.000Z');
    }
  );

  // *** Incompatible / Partially Compatible Cases ***
  // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
  // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.
  apiTest(
    'should add error in ingest, but ES|QL ignores the document when parsing fails',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'log.time',
            formats: ['yyyy/MM/dd'],
          } as DateProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ log: { time: '01-01-2025' } }];
      const { errors } = await testBed.ingest('ingest-date-fail', docs, processors);
      expect(errors[0].reason).toContain('unable to parse date');

      // Since ignore_failure is not set (false by default), the document should not be ingested
      const ingestResult = await testBed.getDocsOrdered('ingest-date-fail');
      expect(ingestResult).toHaveLength(0);

      await testBed.ingest('esql-date-fail', docs);
      const esqlResult = await esql.queryOnIndex('esql-date-fail', query);
      expect(esqlResult.documentsOrdered).toHaveLength(1);
      expect(esqlResult.documentsOrdered[0]['log.time']).toBe('01-01-2025'); // Unchanged
    }
  );
});
