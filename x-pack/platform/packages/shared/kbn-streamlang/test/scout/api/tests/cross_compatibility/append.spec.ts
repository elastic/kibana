/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { AppendProcessor, StreamlangDSL } from '../../../../..';
import { transpile as asIngest } from '../../../../../src/transpilers/ingest_pipeline';
import { transpile as asEsql } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Cross-compatibility - Append Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest.describe('Compatible', () => {
      streamlangApiTest('should append a value to an existing array', async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'append',
              to: 'tags',
              value: ['new_tag'],
            } as AppendProcessor,
          ],
        };

        const { processors } = asIngest(streamlangDSL);
        const { query } = asEsql(streamlangDSL);

        const docs = [{ tags: ['existing_tag'] }];
        await testBed.ingest('ingest-append', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-append');

        await testBed.ingest('esql-append', docs);
        const esqlResult = await esql.queryOnIndex('esql-append', query);

        expect(ingestResult[0].tags).toEqual(['existing_tag', 'new_tag']);
        expect(esqlResult.documents[0].tags).toEqual(['existing_tag', 'new_tag']);
      });

      streamlangApiTest(
        'should append multiple values to a non-existent field',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'append',
                to: 'tags',
                value: ['tag1', 'tag2'],
              } as AppendProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ message: 'a' }];
          await testBed.ingest('ingest-append-non-existent', docs, processors);
          const ingestResult = await testBed.getDocs('ingest-append-non-existent');

          // ES|QL requires the field to be pre-mapped, so we ingest a doc with the field first
          await testBed.ingest('esql-append-non-existent', [{ tags: ['initial_tag'] }]);
          await testBed.ingest('esql-append-non-existent', docs);
          const esqlResult = await esql.queryOnIndex('esql-append-non-existent', query);

          expect(ingestResult[0].tags).toEqual(['tag1', 'tag2']);
          expect(esqlResult.documents[1].tags).toEqual(['tag1', 'tag2']);
        }
      );

      // Template validation tests - both transpilers should consistently REJECT Mustache templates
      [
        {
          templateLabel: 'double-braces',
          templateType: '{{ }}',
          to: '{{template_to}}',
          value: ['{{template_value_01}}', '{{template_value_02}}'],
        },
        {
          templateLabel: 'triple-braces',
          templateType: '{{{ }}}',
          to: '{{{template_to}}}',
          value: ['{{{template_value_01}}}', '{{{template_value_02}}}'],
        },
      ].forEach(({ templateLabel, templateType, to, value }) => {
        streamlangApiTest(
          `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
          async () => {
            const streamlangDSL: StreamlangDSL = {
              steps: [
                {
                  action: 'append',
                  to,
                  value,
                } as AppendProcessor,
              ],
            };

            // Both transpilers should throw validation errors for Mustache templates
            expect(() => asIngest(streamlangDSL)).toThrow(); // Ingest Pipeline transpiler should reject
            expect(() => asEsql(streamlangDSL)).toThrow(); // ES|QL transpiler should reject
          }
        );
      });
    });

    streamlangApiTest.describe('Incompatible', () => {
      streamlangApiTest(
        'should result in an array in ingest, but a scalar in ES|QL for a single value',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'append',
                to: 'tags',
                value: ['new_tag'],
              } as AppendProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ message: 'a' }];
          await testBed.ingest('ingest-append-scalar', docs, processors);
          const ingestResult = await testBed.getDocs('ingest-append-scalar');

          // ES|QL requires the field to be pre-mapped, so we ingest a doc with the field first
          await testBed.ingest('esql-append-scalar', [{ tags: ['initial_tag'] }]);
          await testBed.ingest('esql-append-scalar', docs);
          const esqlResult = await esql.queryOnIndex('esql-append-scalar', query);

          expect(ingestResult[0].tags).toEqual(['new_tag']); // Ingest creates an array
          expect(esqlResult.documents[1].tags).toEqual('new_tag'); // ES|QL creates a scalar
        }
      );

      streamlangApiTest(
        'should result in an array in ingest, but a scalar in ES|QL when deduplicating to a single value',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'append',
                to: 'tags',
                value: ['existing_tag'],
                allow_duplicates: false,
              } as AppendProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ tags: ['existing_tag'] }];
          await testBed.ingest('ingest-append-dedupe', docs, processors);
          const ingestResult = await testBed.getDocs('ingest-append-dedupe');

          await testBed.ingest('esql-append-dedupe', docs);
          const esqlResult = await esql.queryOnIndex('esql-append-dedupe', query);

          expect(ingestResult[0].tags).toEqual(['existing_tag']); // Ingest results in an array
          expect(esqlResult.documents[0].tags).toEqual('existing_tag'); // ES|QL results in a scalar
        }
      );
    });
  }
);
