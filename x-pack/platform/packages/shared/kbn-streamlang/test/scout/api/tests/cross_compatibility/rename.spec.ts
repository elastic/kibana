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
        'should not touch existing fields when override is false',
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

          expect(ingestResult.length).toBe(0); // Did not override
          expect(esqlResult.documents[0]['host.renamed']).toEqual('old-host');
        }
      );

      // Add template tests
      [
        {
          templateLabel: 'double-braces',
          templateType: '{{ }}',
          from: '{{template_from}}',
          to: '{{template_to}}',
        },
        {
          templateLabel: 'triple-braces',
          templateType: '{{{ }}}',
          from: '{{{template_from}}}',
          to: '{{{template_to}}}',
        },
      ].forEach(({ templateType, templateLabel, from, to }) => {
        streamlangApiTest(
          `should consistently handle ${templateType} template syntax for both from and to fields`,
          async ({ testBed, esql }) => {
            const streamlangDSL: StreamlangDSL = {
              steps: [
                {
                  action: 'rename',
                  from,
                  to,
                } as RenameProcessor,
              ],
            };

            const { processors } = asIngest(streamlangDSL);
            const { query } = asEsql(streamlangDSL);

            // Create a document with the literal template strings as fields
            const docs = [
              {
                [from]: 'test-value',
                template_from: 'source.field',
                template_to: 'target.field',
              },
            ];

            await testBed.ingest(`ingest-rename-template-${templateLabel}`, docs, processors);
            const ingestResult = await testBed.getDocs(`ingest-rename-template-${templateLabel}`);

            const mappingDoc = { [from]: '', [to]: '' };
            await testBed.ingest(`esql-rename-template-${templateLabel}`, [mappingDoc, ...docs]);
            const esqlResult = await esql.queryOnIndex(
              `esql-rename-template-${templateLabel}`,
              query
            );

            // Both engines should treat the templates as literal values, not as template variables to substitute
            expect(ingestResult[0]).toHaveProperty(to, 'test-value');
            expect(ingestResult[0]).not.toHaveProperty(from);
            expect(esqlResult.documents[1]).toEqual(
              expect.objectContaining({ [to]: 'test-value' })
            );
            expect(esqlResult.documents[1][from]).toBeUndefined();

            // Both documents should be identical
            expect(ingestResult[0]).toEqual(esqlResult.documentsWithoutKeywords[1]);
          }
        );
      });
    });

    streamlangApiTest.describe('Incompatible', () => {
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

          // Here ES|QL transpiler silently ignores the error to not break the whole pipeline
          expect(esqlResult.documents.length).toBe(2); // mapping doc + actual doc
          expect(esqlResult.documents[1]['host.renamed']).toBeNull();
        }
      );
    });
  }
);
