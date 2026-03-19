/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { SplitProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Split Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***
  apiTest(
    'should correctly split a string into an array using a simple delimiter',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            separator: ',',
          } as SplitProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ tags: 'foo,bar,baz' }];
      await testBed.ingest('ingest-split-basic', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-split-basic');

      await testBed.ingest('esql-split-basic', docs);
      const esqlResult = await esql.queryOnIndex('esql-split-basic', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ tags: ['foo', 'bar', 'baz'] })
      );
    }
  );

  apiTest('should correctly split a string to a target field', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ tags: 'foo,bar,baz' }];
    await testBed.ingest('ingest-split-target', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-split-target');

    await testBed.ingest('esql-split-target', docs);
    const esqlResult = await esql.queryOnIndex('esql-split-target', query);

    expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({
        tags: 'foo,bar,baz', // Original preserved
        tags_array: ['foo', 'bar', 'baz'], // New field created
      })
    );
  });

  apiTest('should split with different delimiters', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'split',
          from: 'path',
          separator: '/',
        } as SplitProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ path: 'home/user/documents' }];
    await testBed.ingest('ingest-split-slash', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-split-slash');

    await testBed.ingest('esql-split-slash', docs);
    const esqlResult = await esql.queryOnIndex('esql-split-slash', query);

    expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({ path: ['home', 'user', 'documents'] })
    );
  });

  apiTest('should handle single value (no delimiter found)', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'split',
          from: 'tags',
          separator: ',',
        } as SplitProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ tags: 'single' }];
    await testBed.ingest('ingest-split-single', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-split-single');

    await testBed.ingest('esql-split-single', docs);
    const esqlResult = await esql.queryOnIndex('esql-split-single', query);

    expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
    expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ tags: ['single'] }));
  });

  apiTest('should support conditional split with where clause', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'split',
          from: 'tags',
          separator: ',',
          where: {
            field: 'should_split',
            eq: 'yes',
          },
        } as SplitProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      { tags: 'foo,bar,baz', should_split: 'yes' },
      { tags: 'one,two,three', should_split: 'no' },
    ];
    await testBed.ingest('ingest-split-conditional', docs, processors);
    const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-split-conditional');

    await testBed.ingest('esql-split-conditional', docs);
    const esqlResult = await esql.queryOnIndex('esql-split-conditional', query);

    expect(ingestResult).toHaveLength(2);
    expect(esqlResult.documents).toHaveLength(2);

    const ingestDoc1 = ingestResult.find((d: any) => d.should_split === 'yes');
    const ingestDoc2 = ingestResult.find((d: any) => d.should_split === 'no');
    const esqlDoc1 = esqlResult.documentsWithoutKeywords.find((d: any) => d.should_split === 'yes');
    const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.should_split === 'no');

    expect(ingestDoc1).toStrictEqual(esqlDoc1);
    expect(ingestDoc1).toStrictEqual(expect.objectContaining({ tags: ['foo', 'bar', 'baz'] }));

    // Both transpilers should keep the original string when condition doesn't match
    expect(ingestDoc2).toStrictEqual(expect.objectContaining({ tags: 'one,two,three' }));
    expect(esqlDoc2).toStrictEqual(expect.objectContaining({ tags: 'one,two,three' }));
  });

  // *** Template validation tests ***
  [
    {
      templateType: '{{ }}',
      from: '{{template_from}}',
      separator: ',',
    },
    {
      templateType: '{{{ }}}',
      from: '{{{template_from}}}',
      separator: ',',
    },
  ].forEach(({ templateType, from, separator }) => {
    apiTest(
      `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'split',
              from,
              separator,
            } as SplitProcessor,
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

  // *** Incompatible / Partially Compatible Cases ***
  // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
  // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.

  apiTest(
    'should document regex separator limitation: Ingest Pipeline supports regex, ES|QL only supports single byte delimiters',
    async ({ testBed, esql }) => {
      // Note: The split processor in Ingest Pipelines supports regex separators,
      // while ES|QL's SPLIT function only supports single byte delimiters.
      // This test documents that simple delimiters work in both, but complex regex patterns
      // may behave differently.

      // Using whitespace regex in Ingest Pipeline vs single space in ES|QL
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'message',
            separator: ' ', // Single space works in both
          } as SplitProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'hello world test' }];
      await testBed.ingest('ingest-split-space', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-split-space');

      await testBed.ingest('esql-split-space', docs);
      const esqlResult = await esql.queryOnIndex('esql-split-space', query);

      // Both should produce the same result with single space delimiter
      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ message: ['hello', 'world', 'test'] })
      );
    }
  );

  apiTest(
    'should handle missing field differently between transpilers when ignore_missing is false',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            separator: ',',
            ignore_missing: false,
          } as SplitProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ other_field: 'value' }]; // Missing 'tags' field

      // NOTE: BEHAVIORAL DIFFERENCE - Missing field handling
      // Ingest Pipeline: Throws error when field is missing and ignore_missing=false
      // ES|QL: Uses WHERE filter to exclude documents with missing field
      const { errors } = await testBed.ingest('ingest-split-fail', docs, processors);
      expect(errors[0].reason).toContain('field [tags] not present as part of path [tags]');

      const mappingDoc = { tags: '' };
      await testBed.ingest('esql-split-fail', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-split-fail', query);
      expect(esqlResult.documentsWithoutKeywords).toHaveLength(1); // Only the mapping doc
    }
  );

  apiTest(
    'should handle preserve_trailing option in Ingest Pipeline (not supported in ES|QL)',
    async ({ testBed, esql }) => {
      // Note: The preserve_trailing option is specific to Ingest Pipeline's split processor
      // ES|QL's SPLIT function does not have an equivalent option

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'split',
            from: 'tags',
            separator: ',',
            preserve_trailing: true,
          } as SplitProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ tags: 'A,,B,,' }]; // Has empty trailing elements
      await testBed.ingest('ingest-split-trailing', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-split-trailing');

      await testBed.ingest('esql-split-trailing', docs);
      const esqlResult = await esql.queryOnIndex('esql-split-trailing', query);

      // NOTE: BEHAVIORAL DIFFERENCE - preserve_trailing handling
      // Ingest Pipeline: With preserve_trailing=true, keeps empty trailing elements
      // ES|QL: Does not support preserve_trailing option, behavior may differ
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ tags: ['A', '', 'B', '', ''] })
      );

      // ES|QL SPLIT behavior: trailing empty strings are typically preserved by default
      // but the exact behavior depends on the ES|QL version
      const esqlTags = esqlResult.documentsWithoutKeywords[0].tags;
      expect(Array.isArray(esqlTags)).toBe(true);
      // At minimum, the non-empty values should be present
      expect(esqlTags).toContain('A');
      expect(esqlTags).toContain('B');
    }
  );
});
