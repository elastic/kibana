/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { ReplaceProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Replace Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'should replace a literal string with EVAL replace() (in-place)',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-replace-basic';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'message',
              pattern: 'error',
              replacement: 'warning',
            } as ReplaceProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [{ message: 'An error occurred' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]?.message).toBe('An warning occurred');
      }
    );

    apiTest(
      'should replace a literal string to target field with EVAL replace()',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-replace-target-field';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'message',
              to: 'clean_message',
              pattern: 'error',
              replacement: 'warning',
            } as ReplaceProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [{ message: 'An error occurred' }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]?.message).toBe('An error occurred'); // Original preserved
        expect(esqlResult.documents[0]?.clean_message).toBe('An warning occurred'); // New field created
      }
    );

    apiTest('should replace using regex pattern', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-replace-regex';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: '\\d{3}',
            replacement: '[NUM]',
          } as ReplaceProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: 'Error code 404 found' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]?.message).toBe('Error code [NUM] found');
    });

    apiTest('should replace literal dot with escaped dot pattern', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-replace-dot';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: '\\.',
            replacement: '-',
          } as ReplaceProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: 'Android.log' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]?.message).toBe('Android-log');
    });

    apiTest('should replace using regex with capture groups', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-replace-capture-groups';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: 'User (\\w+) has (\\d+) new (messages?)',
            replacement: 'Messages: $2 for user $1',
          } as ReplaceProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: 'User alice has 3 new messages' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]?.message).toBe('Messages: 3 for user alice');
    });

    apiTest(
      'should handle ignore_missing: false (default) with WHERE filter',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-replace-no-ignore-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'message',
              pattern: 'error',
              replacement: 'warning',
            } as ReplaceProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docWithField = { message: 'An error occurred', status: 'doc1' };
        const docWithoutField = { status: 'doc2' }; // Should be filtered out
        const docs = [docWithField, docWithoutField];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // ES|QL filters out documents with missing field when ignore_missing: false
        expect(esqlResult.documents).toHaveLength(1);
        expect(esqlResult.documents[0]).toStrictEqual(expect.objectContaining({ status: 'doc1' }));
        expect(esqlResult.documents[0]?.message).toBe('An warning occurred');
      }
    );

    apiTest('should handle ignore_missing: true', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-replace-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: 'error',
            replacement: 'warning',
            ignore_missing: true,
          } as ReplaceProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docWithField = { message: 'An error occurred', status: 'doc1' };
      const docWithoutField = { status: 'doc2' }; // Should pass through
      const docs = [docWithField, docWithoutField];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Both documents should be present
      expect(esqlResult.documents).toHaveLength(2);
      const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
      const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
      expect(doc1?.message).toBe('An warning occurred');
      expect(doc2?.message).toBeNull();
    });

    apiTest('should replace field conditionally with EVAL CASE', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-replace-conditional';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: 'message',
            pattern: 'error',
            replacement: 'warning',
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as ReplaceProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [
        { message: 'An error occurred', event: { kind: 'test' }, status: 'doc1' },
        { message: 'An error occurred', event: { kind: 'production' }, status: 'doc2' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);

      // First doc should have message replaced (where condition matched)
      const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
      expect(doc1?.message).toBe('An warning occurred');
      expect(doc1?.['event.kind']).toBe('test');

      // Second doc should keep original message (where condition not matched)
      const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
      expect(doc2?.message).toBe('An error occurred');
      expect(doc2?.['event.kind']).toBe('production');
    });

    apiTest(
      'should replace to target field conditionally with EVAL CASE',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-replace-conditional-target';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'message',
              to: 'clean_message',
              pattern: 'error',
              replacement: 'warning',
              where: {
                field: 'event.kind',
                eq: 'test',
              },
            } as ReplaceProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [
          {
            message: 'An error occurred',
            clean_message: '',
            event: { kind: 'test' },
            status: 'doc1',
          },
          {
            message: 'An error occurred',
            clean_message: '',
            event: { kind: 'production' },
            status: 'doc2',
          },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);

        // First doc should have clean_message created (where condition matched)
        const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
        expect(doc1?.message).toBe('An error occurred'); // Original preserved
        expect(doc1?.clean_message).toBe('An warning occurred'); // New field created
        expect(doc1?.['event.kind']).toBe('test');

        // Second doc should have clean_message as empty string (where condition not matched)
        const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
        expect(doc2?.message).toBe('An error occurred');
        expect(doc2?.clean_message).toBe('');
        expect(doc2?.['event.kind']).toBe('production');
      }
    );

    apiTest('should reject Mustache template syntax {{ and {{{ in field names', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'replace',
            from: '{{field.name}}',
            pattern: 'error',
            replacement: 'warning',
          } as ReplaceProcessor,
        ],
      };
      expect(() => transpile(streamlangDSL)).toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
      );
    });
  }
);
