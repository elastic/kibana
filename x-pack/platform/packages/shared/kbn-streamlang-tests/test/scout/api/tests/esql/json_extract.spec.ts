/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { JsonExtractProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - JsonExtract Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest(
      'should extract a simple field from JSON string with JSON_EXTRACT',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-json-extract-basic';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'user_id', target_field: 'user_id' }],
            } as JsonExtractProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [{ message: '{"user_id": "abc123"}' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]).toStrictEqual(
          expect.objectContaining({ user_id: 'abc123' })
        );
      }
    );

    apiTest('should extract multiple fields from JSON string', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-json-extract-multiple';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [
              { selector: 'user_id', target_field: 'user_id' },
              { selector: 'status', target_field: 'event_status' },
            ],
          } as JsonExtractProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: '{"user_id": "abc123", "status": "active"}' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({
          user_id: 'abc123',
          event_status: 'active',
        })
      );
    });

    apiTest('should extract nested fields using dot notation', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-json-extract-nested';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'metadata.client.ip', target_field: 'client_ip' }],
          } as JsonExtractProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: '{"metadata": {"client": {"ip": "192.168.1.1"}}}' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ client_ip: '192.168.1.1' })
      );
    });

    apiTest(
      'should handle ignore_missing: false (default) with WHERE filter',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-json-extract-no-ignore-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'user_id', target_field: 'user_id' }],
            } as JsonExtractProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docWithField = { message: '{"user_id": "abc123"}', status: 'doc1' };
        const docWithoutField = { status: 'doc2' };
        const docs = [docWithField, docWithoutField];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]).toStrictEqual(
          expect.objectContaining({ status: 'doc1', user_id: 'abc123' })
        );
      }
    );

    apiTest('should handle ignore_missing: true', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-json-extract-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'user_id', target_field: 'user_id' }],
            ignore_missing: true,
          } as JsonExtractProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docWithField = { message: '{"user_id": "abc123"}', status: 'doc1' };
      const docWithoutField = { status: 'doc2' };
      const docs = [docWithField, docWithoutField];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
      const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
      expect(doc1).toStrictEqual(expect.objectContaining({ user_id: 'abc123' }));
      expect(doc2).toStrictEqual(expect.objectContaining({ user_id: null }));
    });

    apiTest('should extract conditionally with EVAL CASE', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-json-extract-conditional';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'user_id', target_field: 'user_id' }],
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as JsonExtractProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [
        { message: '{"user_id": "abc123"}', event: { kind: 'test' }, status: 'doc1' },
        { message: '{"user_id": "xyz789"}', event: { kind: 'production' }, status: 'doc2' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);

      const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
      expect(doc1).toStrictEqual(expect.objectContaining({ user_id: 'abc123' }));
      expect(doc1?.['event.kind']).toBe('test');

      const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
      expect(doc2).toStrictEqual(expect.objectContaining({ user_id: null }));
      expect(doc2?.['event.kind']).toBe('production');
    });

    apiTest('should extract using selector with $ root prefix', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-json-extract-root-prefix';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: '$.user.name', target_field: 'username' }],
          } as JsonExtractProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: '{"user": {"name": "John"}}' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(expect.objectContaining({ username: 'John' }));
    });

    apiTest('should reject Mustache template syntax {{ and {{{ in field names', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: '{{field.name}}',
            extractions: [{ selector: 'user_id', target_field: 'user.id' }],
          } as JsonExtractProcessor,
        ],
      };
      expect(() => transpile(streamlangDSL)).toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
      );
    });
  }
);
