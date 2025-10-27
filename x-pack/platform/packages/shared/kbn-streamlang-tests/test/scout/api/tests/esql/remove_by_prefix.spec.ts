/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { RemoveByPrefixProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - RemoveByPrefix Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should remove a field', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-remove-by-prefix-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'temp_field',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ temp_field: 'to-be-removed', message: 'keep-this' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).not.toHaveProperty('temp_field');
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ message: 'keep-this' })
      );
    });

    apiTest(
      'should remove a field and all nested fields (subobjects)',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-remove-by-prefix-nested';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              field: 'host',
            } as RemoveByPrefixProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [
          {
            host: {
              name: 'server01',
              ip: '192.168.1.1',
              os: {
                platform: 'linux',
                version: '20.04',
              },
            },
            message: 'keep-this',
          },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.columnNames).not.toContain('host');
        expect(esqlResult.columnNames).not.toContain('host.name');
        expect(esqlResult.columnNames).not.toContain('host.ip');
        expect(esqlResult.columnNames).not.toContain('host.os.platform');
        expect(esqlResult.columnNames).not.toContain('host.os.version');
        expect(esqlResult.documents[0]).toStrictEqual(
          expect.objectContaining({ message: 'keep-this' })
        );
      }
    );

    apiTest('should handle ignore_missing: false (default)', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-remove-by-prefix-no-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'temp_field',
          } as RemoveByPrefixProcessor,
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
      expect(esqlResult.documents[0]).not.toHaveProperty('temp_field');
    });

    apiTest('should handle ignore_missing: true', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-remove-by-prefix-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            field: 'temp_field',
            ignore_missing: true,
          } as RemoveByPrefixProcessor,
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
      expect(doc1).not.toHaveProperty('temp_field');
      expect(doc2).not.toHaveProperty('temp_field');
    });

    apiTest(
      'should reject Mustache template syntax {{ and {{{ in field names',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              field: '{{field.name}}',
            } as RemoveByPrefixProcessor,
          ],
        };
        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      }
    );
  }
);
