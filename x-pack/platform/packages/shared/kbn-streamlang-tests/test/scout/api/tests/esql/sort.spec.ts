/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { SortProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Sort Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest(
    'should sort an array field in ascending order with EVAL MV_SORT() (in-place)',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-sort-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
          } as SortProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] })
      );
    }
  );

  apiTest(
    'should sort an array field in descending order with EVAL MV_SORT()',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-sort-desc';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
            order: 'desc',
          } as SortProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ tags: ['charlie', 'bravo', 'alpha'] })
      );
    }
  );

  apiTest(
    'should sort an array field to target field with EVAL MV_SORT()',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-sort-target-field';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
            to: 'sorted_tags',
            order: 'asc',
          } as SortProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({
          tags: ['charlie', 'alpha', 'bravo'], // Original preserved
          sorted_tags: ['alpha', 'bravo', 'charlie'], // New field created
        })
      );
    }
  );

  apiTest('should sort numeric arrays', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-sort-numeric';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'numbers',
          order: 'asc',
        } as SortProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ numbers: [3, 1, 4, 1, 5, 9, 2, 6] }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({ numbers: [1, 1, 2, 3, 4, 5, 6, 9] })
    );
  });

  apiTest('should handle single element array', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-sort-single-value';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'tags',
        } as SortProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ tags: ['single'] }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(expect.objectContaining({ tags: ['single'] }));
  });

  apiTest('should sort field conditionally with EVAL CASE', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-sort-conditional';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'tags',
          order: 'asc',
          where: {
            field: 'event.kind',
            eq: 'test',
          },
        } as SortProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      { tags: ['charlie', 'alpha', 'bravo'], event: { kind: 'test' }, status: 'doc1' },
      { tags: ['zulu', 'xray', 'yankee'], event: { kind: 'production' }, status: 'doc2' },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(2);

    // First doc should have tags sorted (where condition matched)
    const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
    expect(doc1).toStrictEqual(expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] }));
    expect(doc1?.['event.kind']).toBe('test');

    // Second doc: where condition not matched, processor doesn't sort
    const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
    expect(doc2?.tags).toStrictEqual(expect.arrayContaining(['zulu', 'xray', 'yankee']));
    expect(doc2?.tags).toHaveLength(3);
    expect(doc2?.['event.kind']).toBe('production');
  });

  apiTest('should sort to target field conditionally with EVAL CASE', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-sort-conditional-target';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'tags',
          to: 'sorted_tags',
          order: 'asc',
          where: {
            field: 'event.kind',
            eq: 'test',
          },
        } as SortProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      {
        tags: ['charlie', 'alpha', 'bravo'],
        sorted_tags: [],
        event: { kind: 'test' },
        status: 'doc1',
      },
      {
        tags: ['zulu', 'xray', 'yankee'],
        sorted_tags: [],
        event: { kind: 'production' },
        status: 'doc2',
      },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(2);

    // First doc should have sorted_tags created (where condition matched)
    const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
    expect(doc1).toStrictEqual(
      expect.objectContaining({
        tags: ['charlie', 'alpha', 'bravo'], // Original preserved
        sorted_tags: ['alpha', 'bravo', 'charlie'], // New field sorted
      })
    );
    expect(doc1?.['event.kind']).toBe('test');

    // Second doc should have sorted_tags as empty array (where condition not matched)
    const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
    expect(doc2?.tags).toStrictEqual(expect.arrayContaining(['zulu', 'xray', 'yankee']));
    expect(doc2?.tags).toHaveLength(3);
    expect(doc2).toStrictEqual(expect.objectContaining({ sorted_tags: [] }));
    expect(doc2?.['event.kind']).toBe('production');
  });

  apiTest('should handle ignore_missing: true', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-sort-ignore-missing';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'tags',
          ignore_missing: true,
        } as SortProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docWithField = { tags: ['charlie', 'alpha', 'bravo'], status: 'doc1' };
    const docWithoutField = { status: 'doc2' }; // Should pass through
    const docs = [docWithField, docWithoutField];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // Both documents should be present
    expect(esqlResult.documents).toHaveLength(2);
    const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
    const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
    expect(doc1).toStrictEqual(expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] }));
    expect(doc2).toStrictEqual(expect.objectContaining({ tags: null }));
  });

  apiTest('should reject Mustache template syntax {{ and {{{ in field names', async () => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: '{{field.name}}',
        } as SortProcessor,
      ],
    };
    expect(() => transpile(streamlangDSL)).toThrow(
      'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
    );
  });
});
