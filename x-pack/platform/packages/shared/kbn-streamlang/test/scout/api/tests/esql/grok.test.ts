/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { GrokProcessor, StreamlangDSL } from '../../../../..';
import { transpile } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Streamlang to ES|QL - Grok Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest(
      'should correctly parse a log line with the grok processor',
      async ({ testBed, esql }) => {
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
        const { query } = transpile(streamlangDSL);
        const docs = [{ message: '55.3.244.1 GET /index.html 15824 0.043' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);
        expect(esqlResult.documents[0]).toEqual(
          expect.objectContaining({
            'client.ip': '55.3.244.1',
            'http.request.method': 'GET',
            'url.path': '/index.html',
            'http.response.body.bytes': '15824',
            'event.duration': '0.043',
          })
        );
      }
    );

    streamlangApiTest(
      'should ignore missing field when ignore_missing is true',
      async ({ testBed, esql }) => {
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
        const { query } = transpile(streamlangDSL);
        const docForMapping = { message: '' };
        const docs = [docForMapping, { log: { level: 'info' } }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);
        expect(esqlResult.documents[1]['client.ip']).toBeUndefined();
      }
    );

    streamlangApiTest(
      'should fail if field is missing and ignore_missing is false',
      async ({ testBed, esql }) => {
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
        const { query } = transpile(streamlangDSL);
        const docs = [{ log: { level: 'info' } }];
        await testBed.ingest(indexName, docs);
        await expect(esql.queryOnIndex(indexName, query)).rejects.toThrow();
      }
    );

    streamlangApiTest('should fail when grok pattern does not match', async ({ testBed, esql }) => {
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
      const { query } = transpile(streamlangDSL);
      const docForMapping = { client: { ip: '55.3.244.1' } };
      const docs = [docForMapping, { message: 'not_an_ip' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[1]['client.ip']).toBeUndefined(); // Should be NULL, but it's limitation in ES|QL to check for nullability
    });

    streamlangApiTest.skip('should not grok when where is false', async ({ testBed, esql }) => {
      // ES|QL known limitation: where condition cannot be applied conditionally per document for GROK.
    });
  }
);
