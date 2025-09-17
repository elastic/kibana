/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { RenameProcessor, StreamlangDSL } from '../../../../..';
import { transpile as asIngest } from '../../../../../src/transpilers/ingest_pipeline';
import { transpile as asEsql } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Cross-compatibility - Rename Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest.describe('Compatible', () => {
      streamlangApiTest(
        'should rename a field when override is true',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'rename',
                from: 'host.original',
                to: 'host.renamed',
                override: true,
              } as RenameProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ host: { original: 'test-host', renamed: 'old-host' } }];
          await testBed.ingest('ingest-rename-override', docs, processors);
          const ingestResult = await testBed.getFlattenedDocs('ingest-rename-override');

          await testBed.ingest('esql-rename-override', docs);
          const esqlResult = await esql.queryOnIndex('esql-rename-override', query);

          expect(ingestResult[0]['host.renamed']).toEqual('test-host');
          expect(esqlResult.documents[0]).toEqual(
            expect.objectContaining({ 'host.renamed': 'test-host' })
          );

          // Both results should be same
          expect(ingestResult).toEqual(esqlResult.documentsWithoutKeywords);
        }
      );

      streamlangApiTest(
        'should not process the document when override is false and target field exists',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'rename',
                from: 'host.original',
                to: 'host.renamed',
                override: false,
              } as RenameProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ host: { original: 'test-host', renamed: 'old-host' } }];

          await testBed.ingest('ingest-rename-no-override', docs, processors);
          const ingestResult = await testBed.getFlattenedDocs('ingest-rename-no-override');

          await testBed.ingest('esql-rename-no-override', docs);
          const esqlResult = await esql.queryOnIndex('esql-rename-no-override', query);

          expect(ingestResult).toHaveLength(0);

          // ES|QL too should have filtered out the document as target field exists and override is false
          expect(esqlResult.documents).toHaveLength(0);
        }
      );

      // Template validation tests - both transpilers should consistently REJECT Mustache templates
      [
        {
          templateType: '{{ }}',
          from: '{{template_from}}',
          to: '{{template_to}}',
        },
        {
          templateType: '{{{ }}}',
          from: '{{{template_from}}}',
          to: '{{{template_to}}}',
        },
      ].forEach(({ templateType, from, to }) => {
        streamlangApiTest(
          `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
          async () => {
            const streamlangDSL: StreamlangDSL = {
              steps: [
                {
                  action: 'rename',
                  from,
                  to,
                } as RenameProcessor,
              ],
            };

            // Both transpilers should throw validation errors for Mustache templates
            expect(() => asIngest(streamlangDSL)).toThrow(); // Ingest Pipeline transpiler should reject
            expect(() => asEsql(streamlangDSL)).toThrow(); // ES|QL transpiler should reject
          }
        );
      });

      streamlangApiTest(
        'should be handled by both ingest and ES|QL when field is missing and ignore_missing is false',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'rename',
                from: 'host.original',
                to: 'host.renamed',
                ignore_missing: false,
              } as RenameProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ message: 'some_value' }];

          const { errors } = await testBed.ingest('ingest-rename-fail', docs, processors);
          expect(errors[0].type).toEqual('illegal_argument_exception');
          const ingestResult = await testBed.getFlattenedDocs('ingest-rename-fail');

          const mappingDoc = { host: { original: '', renamed: '' } };
          await testBed.ingest('esql-rename-fail', [mappingDoc, ...docs]);
          const esqlResult = await esql.queryOnIndex('esql-rename-fail', query);

          expect(ingestResult.length).toBe(0); // Did not ingest, errored out

          // Es|QL too should have filtered out the actual doc as 'host.original' is missing and ignore_missing is false
          expect(esqlResult.documents).toHaveLength(0); // Mapping doc also filtered out because host.rename is non null
        }
      );
    });

    // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
    // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.
    streamlangApiTest.describe('Incompatible', () => {});
  }
);
