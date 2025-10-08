/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DissectProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Dissect Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should correctly parse a log line with the dissect processor', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-dissect';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern:
              '[%{@timestamp}] [%{log.level}] %{client.ip} - - "%{@method} %{url.original} HTTP/%{http.version}" %{http.response.status_code} %{http.response.body.bytes}',
          } as DissectProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          message: '[2025-01-01T00:00:00.000Z] [info] 127.0.0.1 - - "GET / HTTP/1.1" 200 123',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source).toHaveProperty('log.level', 'info');
      expect(source).toHaveProperty('client.ip', '127.0.0.1');
      expect(source).toHaveProperty('http.version', '1.1');
      expect(source).toHaveProperty('http.response.status_code', '200');
      expect(source).toHaveProperty('http.response.body.bytes', '123');
    });

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-dissect-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{@timestamp}] [%{log.level}] %{client.ip}',
            ignore_missing: true,
          } as DissectProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source).not.toHaveProperty('client.ip');
    });

    apiTest('should fail if field is missing and ignore_missing is false', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-dissect-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{@timestamp}] [%{log.level}] %{client.ip}',
            ignore_missing: false,
          } as DissectProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }];
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors[0].reason).toContain('field [message] not present as part of path [message]');
    });

    apiTest('should use append_separator', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-dissect-append-separator';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '%{+field1}-%{+field1}',
            append_separator: ',',
          } as DissectProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'value1-value2' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source).toHaveProperty('field1', 'value1,value2');
    });

    [
      {
        templateFrom: '{{fromField}}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateFrom: '{{{fromField}}}',
        description: 'should reject {{{ }}} template syntax in field names',
      },
    ].forEach(({ templateFrom, description }) => {
      apiTest(`${description}`, async ({ testBed }) => {
        expect(() => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'dissect',
                from: templateFrom,
                pattern: '[%{@timestamp}] [%{log.level}] %{client.ip}',
              } as DissectProcessor,
            ],
          };
          transpile(streamlangDSL);
        }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed'); // Added error message for Mustache templates
      });
    });
  }
);
