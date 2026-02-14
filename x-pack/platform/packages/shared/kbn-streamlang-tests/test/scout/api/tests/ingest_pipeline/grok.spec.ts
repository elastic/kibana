/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { GrokProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Grok Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should correctly parse a log line with the grok processor', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-grok';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: [
              '%{IP:client.ip} %{WORD:http.request.method} %{URIPATHPARAM:url.path} %{NUMBER:http.response.body.bytes} %{NUMBER:event.duration}',
            ],
          } as GrokProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '55.3.244.1 GET /index.html 15824 0.043' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.client?.ip).toBe('55.3.244.1');
      expect(source?.http?.request?.method).toBe('GET');
      expect(source?.url?.path).toBe('/index.html');
      expect(source?.http?.response?.body?.bytes).toBe('15824');
      expect(source?.event?.duration).toBe('0.043');
    });

    apiTest('should ignore missing field when ignore_missing is true', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-grok-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip}'],
            ignore_missing: true,
          } as GrokProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }]; // Not including 'message' field
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.client?.ip).toBeUndefined();
    });

    apiTest('should fail if field is missing and ignore_missing is false', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-grok-fail-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip}'],
            ignore_missing: false,
          } as GrokProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ log: { level: 'info' } }]; // 'message' field is missing
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors[0].reason).toContain('field [message] not present as part of path [message]');
    });

    apiTest('should fail when grok pattern does not match', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-grok-fail';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip}'],
          } as GrokProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'not_an_ip' }];
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors[0].reason).toContain('Provided Grok expressions do not match field value');
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
      apiTest(`${description}`, async () => {
        expect(() => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'grok',
                from: templateFrom,
                patterns: [
                  '%{IP:client.ip} %{WORD:http.request.method} %{URIPATHPARAM:url.path} %{NUMBER:http.response.body.bytes} %{NUMBER:event.duration}',
                ],
              } as GrokProcessor,
            ],
          };
          transpile(streamlangDSL);
        }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed');
      });
    });
  }
);
