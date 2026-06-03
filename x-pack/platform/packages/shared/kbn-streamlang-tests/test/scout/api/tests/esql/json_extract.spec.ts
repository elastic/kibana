/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { JsonExtractProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

/**
 * ES|QL-specific JsonExtract Processor Tests
 *
 * These tests document ES|QL-specific behaviors that differ from Ingest Pipeline:
 * - ignore_missing: false filters out documents entirely (WHERE clause)
 * - ignore_missing: true keeps all documents but returns null for missing fields
 *
 * For tests that verify identical behavior between transpilers, see:
 * cross_compatibility/json_extract.spec.ts
 */
apiTest.describe(
  'Streamlang to ES|QL - JsonExtract Processor (ES|QL-specific)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'should filter out documents with missing source field when ignore_missing: false (ES|QL-specific WHERE filter)',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-json-extract-esql-ignore-false';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'user_id', target_field: 'user_id' }],
            } as JsonExtractProcessor,
          ],
        };

        const { query } = await transpile(streamlangDSL);

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

    apiTest(
      'should include all documents with null for missing when ignore_missing: true (ES|QL-specific null handling)',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-json-extract-esql-ignore-true';

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

        const { query } = await transpile(streamlangDSL);

        const docWithField = { message: '{"user_id": "abc123"}', status: 'doc1' };
        const docWithoutField = { status: 'doc2' };
        const docs = [docWithField, docWithoutField];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);
        const doc1 = esqlResult.documents.find((d: Record<string, unknown>) => d.status === 'doc1');
        const doc2 = esqlResult.documents.find((d: Record<string, unknown>) => d.status === 'doc2');
        expect(doc1).toStrictEqual(expect.objectContaining({ user_id: 'abc123' }));
        expect(doc2).toStrictEqual(expect.objectContaining({ user_id: null }));
      }
    );
  }
);
