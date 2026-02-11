/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { DateProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to Ingest Pipeline - Date Processor', () => {
  apiTest(
    'should parse a date and set it to @timestamp',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed }) => {
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
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.['@timestamp']).toBe('2025-01-01T12:34:56.789Z');
    }
  );

  apiTest(
    'should override the field if from and to are same',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed }) => {
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
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.event?.created).toBe('2025-01-01');
    }
  );

  apiTest(
    'should parse a date with a specific format',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed }) => {
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
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.event?.created_date).toBe('2025-01-01T12:34:56.000Z');
    }
  );

  // This test fails/flaky on Serverless, which is a different behavior then Stateful and needs to be checked
  apiTest('should handle multiple formats', { tag: ['@ess'] }, async ({ testBed }) => {
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

    const ingestedDocs = await testBed.getDocsOrdered(indexName);
    expect(ingestedDocs).toHaveLength(2);
    expect(ingestedDocs[0]?.event?.created_date).toBe('01 01 2025 12:34');
    expect(ingestedDocs[1]?.event?.created_date).toBe('01 01 2025 12:35');
  });

  apiTest(
    'should parse a date with a specific output format',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed }) => {
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
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.event?.created_date).toBe('2025-01-01');
    }
  );

  apiTest(
    'should fail when date format is incorrect',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed }) => {
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
    }
  );

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
    apiTest(`${description}`, { tag: ['@ess', '@svlOblt'] }, async () => {
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
      }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed');
    });
  });

  apiTest(
    'should parse a date with a specific locale and timezone',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed }) => {
      const indexName = 'stream-e2e-test-locale-timezone';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            to: 'event.created_date',
            formats: ['dd MMMM yyyy'],
            locale: 'fr',
            timezone: 'Europe/Paris',
          } as DateProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ event: { created: '10 septembre 2025' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]?.event?.created_date).toBe('2025-09-10T00:00:00.000+02:00');
    }
  );

  apiTest(
    'should fail when locale is not valid',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed }) => {
      const indexName = 'stream-e2e-test-locale-fail';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            to: 'event.created_date',
            formats: ['dd MMMM yyyy'],
            locale: 'french',
            timezone: 'Europe/Paris',
          } as DateProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ event: { created: '10 septembre 2025' } }];
      await testBed.ingest(indexName, docs, processors);

      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors[0].reason).toContain('unable to parse date');
      expect(errors[0].caused_by?.reason).toContain('Unknown language: french');
    }
  );

  apiTest(
    'should fail when timezone is not valid',
    { tag: ['@ess', '@svlOblt'] },
    async ({ testBed }) => {
      const indexName = 'stream-e2e-test-timezone-fail';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'event.created',
            to: 'event.created_date',
            formats: ['dd MMMM yyyy'],
            locale: 'fr',
            timezone: 'France',
          } as DateProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ event: { created: '10 septembre 2025' } }];
      await testBed.ingest(indexName, docs, processors);

      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors[0].reason).toContain('unable to parse date');
      expect(errors[0].caused_by?.reason).toContain('Unknown time-zone ID: France');
    }
  );
});
