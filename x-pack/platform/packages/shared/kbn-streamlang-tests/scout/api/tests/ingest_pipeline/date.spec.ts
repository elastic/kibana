/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DateProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Streamlang to Ingest Pipeline - Date Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest('should parse a date and set it to @timestamp', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ log: { time: '2025-01-01T12:34:56.789Z' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs.length).toBe(1);
      expect(ingestedDocs[0]).toHaveProperty('@timestamp', '2025-01-01T12:34:56.789Z');
    });

    streamlangApiTest('should override the field if from and to are same', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-date-override';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            to: 'event.created',
            formats: ['ISO8601'],
            output_format: 'yyyy-MM-dd',
          } as DateProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ event: { created: '2025-01-01T12:34:56.789Z' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs.length).toBe(1);
      expect(ingestedDocs[0]).toHaveProperty('event.created', '2025-01-01');
    });

    streamlangApiTest('should parse a date with a specific format', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-date-format';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            to: 'event.created_date',
            formats: ['dd/MM/yyyy:HH:mm:ss'],
          } as DateProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ event: { created: '01/01/2025:12:34:56' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs.length).toBe(1);
      expect(ingestedDocs[0]).toHaveProperty('event.created_date', '2025-01-01T12:34:56.000Z');
    });

    streamlangApiTest('should handle multiple formats', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-date-multiple-formats';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            to: 'event.created_date',
            formats: ['dd/MM/yyyy:HH:mm:ss', 'ISO8601'],
            output_format: 'dd MM yyyy HH:mm',
          } as DateProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { event: { created: '01/01/2025:12:34:56' } },
        { event: { created: '2025-01-01T12:35:57.789Z' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs.length).toBe(2);
      expect(ingestedDocs[0]).toHaveProperty('event.created_date', '01 01 2025 12:34');
      expect(ingestedDocs[1]).toHaveProperty('event.created_date', '01 01 2025 12:35');
    });

    streamlangApiTest('should parse a date with a specific output format', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-date-output-format';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            to: 'event.created_date',
            formats: ['ISO8601'],
            output_format: 'yyyy-MM-dd',
          } as DateProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ event: { created: '2025-01-01T12:34:56.789Z' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs.length).toBe(1);
      expect(ingestedDocs[0]).toHaveProperty('event.created_date', '2025-01-01');
    });

    streamlangApiTest('should fail when date format is incorrect', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-date-fail';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            formats: ['yyyy/MM/dd'],
          } as DateProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ event: { created: '01-01-2025' } }];
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors[0].reason).toContain('unable to parse date');
    });

    [
      {
        templateFrom: '{{fromField}}',
        templateTo: '{{toField}}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateFrom: '{{{fromField}}}',
        templateTo: '{{{toField}}}',
        description: 'should reject {{{ }}} template syntax in field names',
      },
    ].forEach(({ templateFrom, templateTo, description }) => {
      streamlangApiTest(description, async ({ testBed }) => {
        expect(() => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'date',
                from: templateFrom,
                to: templateTo,
                formats: ['ISO8601'],
                output_format: 'yyyy-MM-dd',
              } as DateProcessor,
            ],
          };
          transpile(streamlangDSL);
        }).toThrow(); // Should throw validation error for Mustache templates
      });
    });
  }
);
