/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RemoveProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Remove Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should remove a field with DROP', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-remove-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'temp_field',
          } as RemoveProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ temp_field: 'to-be-removed', message: 'keep-this' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]?.temp_field).toBeUndefined();
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ message: 'keep-this' })
      );
    });

    apiTest(
      'should handle ignore_missing: false (default) with DROP',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-remove-no-ignore-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove',
              from: 'temp_field',
            } as RemoveProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docWithField = { temp_field: 'to-be-removed', message: 'doc1' };
        const docWithoutField = { message: 'doc2' }; // Should be filtered out
        const docs = [docWithField, docWithoutField];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // ES|QL filters out documents with missing field when ignore_missing: false
        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]).toStrictEqual(expect.objectContaining({ message: 'doc1' }));
        expect(esqlResult.documents[0]?.temp_field).toBeUndefined();
      }
    );

    apiTest('should handle ignore_missing: true with DROP', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-remove-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'temp_field',
            ignore_missing: true,
          } as RemoveProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docWithField = { temp_field: 'to-be-removed', message: 'doc1' };
      const docWithoutField = { message: 'doc2' }; // Should pass through
      const docs = [docWithField, docWithoutField];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Both documents should be present
      expect(esqlResult.documents).toHaveLength(2);
      const doc1 = esqlResult.documents.find((d: any) => d.message === 'doc1');
      const doc2 = esqlResult.documents.find((d: any) => d.message === 'doc2');
      expect(doc1?.temp_field).toBeUndefined();
      expect(doc2?.temp_field).toBeUndefined();
    });

    apiTest('should remove field conditionally with EVAL CASE', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-remove-conditional';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: 'temp_data',
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as RemoveProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [
        { temp_data: 'remove-me', event: { kind: 'test' }, message: 'doc1' },
        { temp_data: 'keep-me', event: { kind: 'production' }, message: 'doc2' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);

      // First doc should have temp_data nulled (where condition matched)
      const doc1 = esqlResult.documents.find((d: any) => d.message === 'doc1');
      // Note: ESQL CASE sets to null, which is removed from the result
      expect(doc1?.temp_data).toBeNull();
      expect(doc1?.['event.kind']).toBe('test');

      // Second doc should keep temp_data (where condition not matched)
      const doc2 = esqlResult.documents.find((d: any) => d.message === 'doc2');
      expect(doc2?.temp_data).toBe('keep-me');
      expect(doc2?.['event.kind']).toBe('production');
    });

    apiTest('should reject Mustache template syntax {{ and {{{ in field names', async ({}) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove',
            from: '{{field.name}}',
          } as RemoveProcessor,
        ],
      };
      expect(() => transpile(streamlangDSL)).toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
      );
    });
  }
);
