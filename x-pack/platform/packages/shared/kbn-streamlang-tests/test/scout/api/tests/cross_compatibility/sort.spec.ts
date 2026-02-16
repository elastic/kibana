/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { SortProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Sort Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest(
    'should correctly sort an array in ascending order (default)',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
          } as SortProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
      await testBed.ingest('ingest-sort-asc', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-sort-asc');

      await testBed.ingest('esql-sort-asc', docs);
      const esqlResult = await esql.queryOnIndex('esql-sort-asc', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] })
      );
    }
  );

  apiTest('should correctly sort an array in descending order', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'tags',
          order: 'desc',
        } as SortProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
    await testBed.ingest('ingest-sort-desc', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-sort-desc');

    await testBed.ingest('esql-sort-desc', docs);
    const esqlResult = await esql.queryOnIndex('esql-sort-desc', query);

    expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({ tags: ['charlie', 'bravo', 'alpha'] })
    );
  });

  apiTest('should correctly sort an array to a target field', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ tags: ['charlie', 'alpha', 'bravo'] }];
    await testBed.ingest('ingest-sort-target', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-sort-target');

    await testBed.ingest('esql-sort-target', docs);
    const esqlResult = await esql.queryOnIndex('esql-sort-target', query);

    expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({
        tags: ['charlie', 'alpha', 'bravo'], // Original preserved
        sorted_tags: ['alpha', 'bravo', 'charlie'], // New field created
      })
    );
  });

  apiTest('should sort numeric arrays', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'numbers',
          order: 'asc',
        } as SortProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ numbers: [3, 1, 4, 1, 5, 9, 2, 6] }];
    await testBed.ingest('ingest-sort-numeric', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-sort-numeric');

    await testBed.ingest('esql-sort-numeric', docs);
    const esqlResult = await esql.queryOnIndex('esql-sort-numeric', query);

    expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({ numbers: [1, 1, 2, 3, 4, 5, 6, 9] })
    );
  });

  apiTest('should handle single element array', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'tags',
        } as SortProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ tags: ['single'] }];
    await testBed.ingest('ingest-sort-single', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-sort-single');

    await testBed.ingest('esql-sort-single', docs);
    const esqlResult = await esql.queryOnIndex('esql-sort-single', query);

    expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ tags: ['single'] }));
  });

  apiTest('should support conditional sort with where clause', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'sort',
          from: 'tags',
          order: 'asc',
          where: {
            field: 'should_sort',
            eq: 'yes',
          },
        } as SortProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      { tags: ['charlie', 'alpha', 'bravo'], should_sort: 'yes' },
      { tags: ['zulu', 'xray', 'yankee'], should_sort: 'no' },
    ];
    await testBed.ingest('ingest-sort-conditional', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-sort-conditional');

    await testBed.ingest('esql-sort-conditional', docs);
    const esqlResult = await esql.queryOnIndex('esql-sort-conditional', query);

    expect(ingestResult).toHaveLength(2);
    expect(esqlResult.documents).toHaveLength(2);

    const ingestDoc1 = ingestResult.find((d: any) => d.should_sort === 'yes');
    const ingestDoc2 = ingestResult.find((d: any) => d.should_sort === 'no');
    const esqlDoc1 = esqlResult.documentsWithoutKeywords.find((d: any) => d.should_sort === 'yes');
    const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.should_sort === 'no');

    expect(ingestDoc1).toStrictEqual(esqlDoc1);
    expect(ingestDoc1).toStrictEqual(
      expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] })
    );

    // Both transpilers should not apply sort when condition doesn't match
    expect(ingestDoc2?.tags).toStrictEqual(expect.arrayContaining(['zulu', 'xray', 'yankee']));
    expect(ingestDoc2?.tags).toHaveLength(3);
    expect(esqlDoc2?.tags).toStrictEqual(expect.arrayContaining(['zulu', 'xray', 'yankee']));
    expect(esqlDoc2?.tags).toHaveLength(3);
  });

  apiTest(
    'should handle ignore_missing consistently between transpilers',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'sort',
            from: 'tags',
            ignore_missing: true,
          } as SortProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        { tags: ['charlie', 'alpha', 'bravo'], status: 'has_tags' },
        { status: 'no_tags' }, // Missing 'tags' field
      ];

      await testBed.ingest('ingest-sort-ignore-missing', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-sort-ignore-missing');

      await testBed.ingest('esql-sort-ignore-missing', docs);
      const esqlResult = await esql.queryOnIndex('esql-sort-ignore-missing', query);

      expect(ingestResult).toHaveLength(2);
      expect(esqlResult.documents).toHaveLength(2);

      // Document with tags should be sorted
      const ingestDoc1 = ingestResult.find((d: any) => d.status === 'has_tags');
      const esqlDoc1 = esqlResult.documentsWithoutKeywords.find(
        (d: any) => d.status === 'has_tags'
      );
      expect(ingestDoc1).toStrictEqual(
        expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] })
      );
      expect(esqlDoc1).toStrictEqual(
        expect.objectContaining({ tags: ['alpha', 'bravo', 'charlie'] })
      );

      // Document without tags should pass through unchanged
      const ingestDoc2 = ingestResult.find((d: any) => d.status === 'no_tags');
      const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.status === 'no_tags');
      expect((ingestDoc2 as Record<string, unknown>).tags).toBeUndefined();
      expect(esqlDoc2).toStrictEqual(expect.objectContaining({ tags: null }));
    }
  );

  // *** Template validation tests ***
  [
    {
      templateType: '{{ }}',
      from: '{{template_from}}',
    },
    {
      templateType: '{{{ }}}',
      from: '{{{template_from}}}',
    },
  ].forEach(({ templateType, from }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'sort',
              from,
            } as SortProcessor,
          ],
        };

        // Both transpilers should reject Mustache template syntax
        expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
        expect(() => transpileEsql(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      }
    );
  });
});
