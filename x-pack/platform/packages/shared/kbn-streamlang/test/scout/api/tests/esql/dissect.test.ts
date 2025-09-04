/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DissectProcessor, StreamlangDSL } from '../../../../..';
import { transpile } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Streamlang to ES|QL - Dissect Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest(
      'should correctly parse a log line with the dissect processor',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-dissect';
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'dissect',
              from: 'message',
              pattern:
                '[%{@timestamp}] [%{log.level}] %{client.ip} - - "%{http.request.method} %{url.original} HTTP/%{http.version}" %{http.response.status_code} %{http.response.body.bytes}',
            } as DissectProcessor,
          ],
        };
        const { query } = transpile(streamlangDSL);
        const docs = [
          {
            message: '[2025-01-01T00:00:00.000Z] [info] 127.0.0.1 - - "GET / HTTP/1.1" 200 123',
          },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);
        expect(esqlResult.documents[0]).toEqual(
          expect.objectContaining({
            'log.level': 'info',
            'client.ip': '127.0.0.1',
            'http.request.method': 'GET',
            'url.original': '/',
            'http.version': '1.1',
            'http.response.status_code': '200',
            'http.response.body.bytes': '123',
          })
        );
      }
    );

    streamlangApiTest(
      'should ignore missing field when ignore_missing is true',
      async ({ testBed, esql }) => {
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
        const { query } = transpile(streamlangDSL);

        // Ingest a doc with message to satisfy ES|QL requirement that any field used in the query must be pre-mapped (available as a column)
        const docForMapping = {
          '@timestamp': '',
          message: '',
          log: { level: '' },
          host: { name: '' },
        };
        const docs = [docForMapping, { log: { level: 'info' } }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // Known ES|QL limitation: ignore_missing cannot be handled conditionally per document.
        // So dissected fields are undefined if the source field is missing.
        expect(esqlResult.documents[1]['log.level']).toBeUndefined();
        expect(esqlResult.documents[1]['client.ip']).toBeUndefined();
      }
    );

    streamlangApiTest(
      'should produce empty dissections when ignore_missing is false',
      async ({ testBed, esql }) => {
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
        const { query } = transpile(streamlangDSL);

        const docForMapping = { message: '[2025-01-01T00:00:00.000Z] [info] 192.168.90.9' };
        const docs = [docForMapping, { log: { level: 'info' } }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents[1]['log.level']).toBeNull(); // Overwritten to null as ignore_missing is false
        expect(esqlResult.documents[1]['client.ip']).toBeNull();
      }
    );

    streamlangApiTest('should use append_separator', async ({ testBed, esql }) => {
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
      const { query } = transpile(streamlangDSL);
      const docs = [{ message: 'value1-value2' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documents[0]).toEqual(
        expect.objectContaining({
          field1: 'value1,value2',
        })
      );
    });

    // ES|QL known limitation: where condition cannot be applied conditionally per document.
    streamlangApiTest.skip('should not dissect when where is false', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-dissect-where-false';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '[%{log.level}]',
            where: {
              field: 'attributes.should_exist',
              exists: true,
            },
          } as DissectProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docForMapping = { log: { level: 'info' } };
      const docs = [
        docForMapping,
        { attributes: { should_exist: 'YES' }, message: '[info]' },
        { attributes: { size: 2048 }, message: '[warn]' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents[1]).toEqual(
        expect.objectContaining({
          'log.level': 'info',
        })
      );
      expect(esqlResult.documents[2]['log.level']).toBeNull();
    });
  }
);
