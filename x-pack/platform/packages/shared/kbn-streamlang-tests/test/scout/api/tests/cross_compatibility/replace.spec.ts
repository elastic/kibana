/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { ReplaceProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Replace Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // *** Compatible Cases ***
    apiTest(
      'should correctly replace a literal string in both Ingest Pipeline and ES|QL (in-place)',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: 'An error occurred' }];
        await testBed.ingest('ingest-replace', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-replace');

        await testBed.ingest('esql-replace', docs);
        const esqlResult = await esql.queryOnIndex('esql-replace', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]?.message).toBe('An warning occurred');
      }
    );

    apiTest(
      'should correctly replace a literal string to target field in both Ingest Pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: 'An error occurred' }];
        await testBed.ingest('ingest-replace-target', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-replace-target');

        await testBed.ingest('esql-replace-target', docs);
        const esqlResult = await esql.queryOnIndex('esql-replace-target', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]?.message).toBe('An error occurred'); // Original preserved
        expect(ingestResult[0]?.clean_message).toBe('An warning occurred'); // New field created
      }
    );

    apiTest(
      'should correctly replace using regex pattern in both Ingest Pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: 'Error code 404 found' }];
        await testBed.ingest('ingest-replace-regex', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-replace-regex');

        await testBed.ingest('esql-replace-regex', docs);
        const esqlResult = await esql.queryOnIndex('esql-replace-regex', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]?.message).toBe('Error code [NUM] found');
      }
    );

    apiTest(
      'should correctly replace using regex with capture groups in both Ingest Pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: 'User alice has 3 new messages' }];
        await testBed.ingest('ingest-replace-capture', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-replace-capture');

        await testBed.ingest('esql-replace-capture', docs);
        const esqlResult = await esql.queryOnIndex('esql-replace-capture', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]?.message).toBe('Messages: 3 for user alice');
      }
    );

    apiTest(
      'should support conditional replacement with where clause in both Ingest Pipeline and ES|QL',
      async ({ testBed, esql }) => {
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { message: 'An error occurred', event: { kind: 'test' } },
          { message: 'An error occurred', event: { kind: 'production' } },
        ];
        await testBed.ingest('ingest-replace-conditional', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-replace-conditional');

        await testBed.ingest('esql-replace-conditional', docs);
        const esqlResult = await esql.queryOnIndex('esql-replace-conditional', query);

        // Both should produce the same results
        expect(ingestResult).toHaveLength(2);
        expect(esqlResult.documents).toHaveLength(2);

        const ingestDoc1 = ingestResult.find((d: any) => d['event.kind'] === 'test');
        const ingestDoc2 = ingestResult.find((d: any) => d['event.kind'] === 'production');
        const esqlDoc1 = esqlResult.documentsWithoutKeywords.find(
          (d: any) => d['event.kind'] === 'test'
        );
        const esqlDoc2 = esqlResult.documentsWithoutKeywords.find(
          (d: any) => d['event.kind'] === 'production'
        );

        expect(ingestDoc1).toStrictEqual(esqlDoc1);
        expect(ingestDoc2).toStrictEqual(esqlDoc2);
        expect(ingestDoc1?.message).toBe('An warning occurred');
        expect(ingestDoc2?.message).toBe('An error occurred');
      }
    );

    apiTest(
      'should fail when source field is of non-string type (e.g., numeric) in both Ingest Pipeline and ES|QL',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'status_code',
              pattern: '\\d+',
              replacement: '[NUM]',
            } as ReplaceProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // Source field is numeric (non-string)
        const docs = [{ status_code: 404, message: 'test' }];

        // Ingest Pipeline should fail - gsub processor expects string field
        const { errors: ingestErrors } = await testBed.ingest(
          'ingest-replace-numeric-source',
          docs,
          processors
        );
        expect(ingestErrors.length).toBeGreaterThan(0);
        expect(ingestErrors[0].type).toBe('illegal_argument_exception');

        // ES|QL should also fail - replace() function expects string input
        await testBed.ingest('esql-replace-numeric-source', docs);
        // ES|QL throws Root causes: verification_exception: ... first argument of [REPLACE(status_code, \"\\\\d+\", \"[NUM]\")] must be [string] ..."
        await expect(esql.queryOnIndex('esql-replace-numeric-source', query)).rejects.toThrow(
          /first argument of[\s\S]*must be \[string\]/
        );
      }
    );

    apiTest(
      'should successfully overwrite non-string target field (e.g., numeric) in both Ingest Pipeline and ES|QL',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'message',
              to: 'status_code',
              pattern: 'error',
              replacement: 'warning',
            } as ReplaceProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // Target field exists as numeric, source field is string
        const docs = [{ message: 'An error occurred', status_code: 404 }];
        await testBed.ingest('ingest-replace-numeric-target', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-replace-numeric-target');

        await testBed.ingest('esql-replace-numeric-target', docs);
        const esqlResult = await esql.queryOnIndex('esql-replace-numeric-target', query);

        // Both should overwrite the numeric target field with the string result
        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]?.message).toBe('An error occurred'); // Source preserved
        expect(ingestResult[0]?.status_code).toBe('An warning occurred'); // Target overwritten with string
      }
    );

    [
      {
        templateType: '{{ }}',
        from: '{{template_from}}',
        pattern: 'error',
        replacement: 'warning',
      },
      {
        templateType: '{{{ }}}',
        from: '{{{template_from}}}',
        pattern: 'error',
        replacement: 'warning',
      },
    ].forEach(({ templateType, from, pattern, replacement }) => {
      apiTest(
        `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
        async () => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'replace',
                from,
                pattern,
                replacement,
              } as ReplaceProcessor,
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
      'should document multi-value array limitation: Ingest Pipeline supports arrays, ES|QL does not',
      async ({ testBed, esql }) => {
        // Note: The gsub processor in Ingest Pipelines supports multi-value arrays (arrays of strings),
        // where all members of the array are converted. However, ES|QL cannot cleanly handle this
        // due to inability to collapse MV_EXPAND results back to arrays.
        // See: https://github.com/elastic/elasticsearch/issues/133988
        //
        // This test documents that single-value strings work correctly in both transpilers.
        // Multi-value arrays would work in Ingest Pipeline but cannot be properly handled in ES|QL.

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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: ['An error occurred 01', 'An error occurred 02'] }];
        await testBed.ingest('ingest-replace-single', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-replace-single');

        await testBed.ingest('esql-replace-single', docs);
        const esqlResult = await esql.queryOnIndex('esql-replace-single', query);

        // Ingest Pipeline processes all array elements
        expect(ingestResult[0]?.message).toStrictEqual([
          'An warning occurred 01',
          'An warning occurred 02',
        ]);

        // ES|QL sets the field to null since it cannot handle multi-value arrays for replace()
        expect(esqlResult.documentsWithoutKeywords[0]?.message).toBeNull();
      }
    );
  }
);
