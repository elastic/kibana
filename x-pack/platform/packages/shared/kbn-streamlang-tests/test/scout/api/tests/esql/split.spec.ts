/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { SplitProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Split Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest(
    'should split a string field into an array with EVAL SPLIT() (in-place)',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-split-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            separator: ',',
          } as SplitProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ tags: 'foo,bar,baz' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ tags: ['foo', 'bar', 'baz'] })
      );
    }
  );

  apiTest(
    'should split a string field to target field with EVAL SPLIT()',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-split-target-field';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            to: 'tags_array',
            separator: ',',
          } as SplitProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ tags: 'foo,bar,baz' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({
          tags: 'foo,bar,baz', // Original preserved
          tags_array: ['foo', 'bar', 'baz'], // New field created
        })
      );
    }
  );

  apiTest('should split using various single byte delimiters', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-split-delimiters';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'split',
          from: 'path',
          separator: '/',
        } as SplitProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ path: 'home/user/documents' }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({ path: ['home', 'user', 'documents'] })
    );
  });

  apiTest('should handle single value (no delimiter found)', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-split-single-value';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'split',
          from: 'tags',
          separator: ',',
        } as SplitProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ tags: 'single' }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(expect.objectContaining({ tags: ['single'] }));
  });

  apiTest(
    'should handle ignore_missing: false (default) with WHERE filter',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-split-no-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            separator: ',',
          } as SplitProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docWithField = { tags: 'foo,bar,baz', status: 'doc1' };
      const docWithoutField = { status: 'doc2' }; // Should be filtered out
      const docs = [docWithField, docWithoutField];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // ES|QL filters out documents with missing field when ignore_missing: false
      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ status: 'doc1', tags: ['foo', 'bar', 'baz'] })
      );
    }
  );

  apiTest('should handle ignore_missing: true', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-split-ignore-missing';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'split',
          from: 'tags',
          separator: ',',
          ignore_missing: true,
        } as SplitProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docWithField = { tags: 'foo,bar,baz', status: 'doc1' };
    const docWithoutField = { status: 'doc2' }; // Should pass through
    const docs = [docWithField, docWithoutField];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // Both documents should be present
    expect(esqlResult.documents).toHaveLength(2);
    const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
    const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
    expect(doc1).toStrictEqual(expect.objectContaining({ tags: ['foo', 'bar', 'baz'] }));
    expect(doc2).toStrictEqual(expect.objectContaining({ tags: null }));
  });

  apiTest('should split field conditionally with EVAL CASE', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-split-conditional';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'split',
          from: 'tags',
          separator: ',',
          where: {
            field: 'event.kind',
            eq: 'test',
          },
        } as SplitProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      { tags: 'foo,bar,baz', event: { kind: 'test' }, status: 'doc1' },
      { tags: 'one,two,three', event: { kind: 'production' }, status: 'doc2' },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(2);

    // First doc should have tags split (where condition matched)
    const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
    expect(doc1).toStrictEqual(expect.objectContaining({ tags: ['foo', 'bar', 'baz'] }));
    expect(doc1?.['event.kind']).toBe('test');

    // Second doc should keep original tags (where condition not matched)
    const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
    expect(doc2).toStrictEqual(expect.objectContaining({ tags: 'one,two,three' }));
    expect(doc2?.['event.kind']).toBe('production');
  });

  apiTest(
    'should split to target field conditionally with EVAL CASE',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-split-conditional-target';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            to: 'tags_array',
            separator: ',',
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as SplitProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [
        {
          tags: 'foo,bar,baz',
          tags_array: '',
          event: { kind: 'test' },
          status: 'doc1',
        },
        {
          tags: 'one,two,three',
          tags_array: '',
          event: { kind: 'production' },
          status: 'doc2',
        },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);

      // First doc should have tags_array created (where condition matched)
      const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
      expect(doc1).toStrictEqual(
        expect.objectContaining({
          tags: 'foo,bar,baz', // Original preserved
          tags_array: ['foo', 'bar', 'baz'], // New field created
        })
      );
      expect(doc1?.['event.kind']).toBe('test');

      // Second doc should have tags_array as empty string (where condition not matched)
      const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
      expect(doc2).toStrictEqual(
        expect.objectContaining({
          tags: 'one,two,three',
          tags_array: '',
        })
      );
      expect(doc2?.['event.kind']).toBe('production');
    }
  );

  apiTest('should reject Mustache template syntax {{ and {{{ in field names', async () => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'split',
          from: '{{field.name}}',
          separator: ',',
        } as SplitProcessor,
      ],
    };
    expect(() => transpile(streamlangDSL)).toThrow(
      'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
    );
  });
});
