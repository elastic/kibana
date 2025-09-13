/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DissectProcessor, StreamlangDSL } from '../../../../..';
import { transpile as asIngest } from '../../../../../src/transpilers/ingest_pipeline';
import { transpile as asEsql } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Cross-compatibility - Dissect Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest.describe('Compatible', () => {
      streamlangApiTest(
        'should correctly parse a log line with the dissect processor',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'dissect',
                from: 'message',
                pattern:
                  '[%{@timestamp}] [%{log.level}] %{client.ip} - - "%{@method} %{url.original} HTTP/%{http.version}" %{http.response.status_code} %{http.response.body.bytes}',
              } as DissectProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [
            {
              message: '[2025-01-01T00:00:00.000Z] [info] 127.0.0.1 - - "GET / HTTP/1.1" 200 123',
            },
          ];
          await testBed.ingest('ingest-dissect', docs, processors);
          const ingestResult = await testBed.getFlattenedDocs('ingest-dissect');

          await testBed.ingest('esql-dissect', docs);
          const esqlResult = await esql.queryOnIndex('esql-dissect', query);

          expect(ingestResult[0]).toEqual(esqlResult.documentsWithoutKeywords[0]);
        }
      );

      streamlangApiTest(
        'should support append_separator in ingest as well as in ES|QL',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'dissect',
                from: 'message',
                pattern: '%{+field1}-%{+field1}',
                append_separator: ',',
              } as DissectProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ message: 'value1-value2' }];
          await testBed.ingest('ingest-dissect-append', docs, processors);
          const ingestResult = await testBed.getFlattenedDocs('ingest-dissect-append');

          await testBed.ingest('esql-dissect-append', docs);
          const esqlResult = await esql.queryOnIndex('esql-dissect-append', query);

          expect(ingestResult[0]).toHaveProperty('field1', 'value1,value2');
          expect(esqlResult.documentsWithoutKeywords[0]).toEqual(
            expect.objectContaining({ field1: 'value1,value2' })
          );

          // Both ingest and ES|QL should produce the same result
          expect(ingestResult[0]).toEqual(esqlResult.documentsWithoutKeywords[0]);
        }
      );

      // Template validation tests - both transpilers should consistently REJECT Mustache templates
      [
        {
          templateLabel: 'double-braces',
          templateType: '{{ }}',
          from: '{{template_from}}',
          pattern: '[%{log.level}]',
        },
        {
          templateLabel: 'triple-braces',
          templateType: '{{{ }}}',
          from: '{{{template_from}}}',
          pattern: '[%{log.level}]',
        },
      ].forEach(({ templateLabel, templateType, from, pattern }) => {
        streamlangApiTest(
          `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
          async () => {
            const streamlangDSL: StreamlangDSL = {
              steps: [
                {
                  action: 'dissect',
                  from,
                  pattern,
                } as DissectProcessor,
              ],
            };

            // Both transpilers should throw validation errors for Mustache templates
            expect(() => asIngest(streamlangDSL)).toThrow(); // Ingest Pipeline transpiler should reject
            expect(() => asEsql(streamlangDSL)).toThrow(); // ES|QL transpiler should reject
          }
        );
      });

      streamlangApiTest.describe('Incompatible', () => {
        streamlangApiTest(
          'should support where clause both in ingest as well as in ES|QL',
          async ({ testBed, esql }) => {
            const streamlangDSL: StreamlangDSL = {
              steps: [
                {
                  action: 'dissect',
                  from: 'message',
                  pattern: '[%{log.level}]',
                  where: {
                    field: 'attributes.should_exist',
                    exists: true,
                  },
                } as DissectProcessor,
              ],
            };

            const { processors } = asIngest(streamlangDSL);
            const { query } = asEsql(streamlangDSL);

            const docs = [
              { case: 'dissected', attributes: { should_exist: 'YES' }, message: '[info]' },
              { case: 'missing', attributes: { size: 2048 }, message: '[warn]' },
            ];
            await testBed.ingest('ingest-dissect-where', docs, processors);
            const ingestResult = await testBed.getFlattenedDocs('ingest-dissect-where');

            const mappingDoc = { log: { level: '' } };
            await testBed.ingest('esql-dissect-where', [mappingDoc, ...docs]);
            const esqlResult = await esql.queryOnIndex('esql-dissect-where', query);

            // Loop is needed as ES|QL's FORK may return documents in different order
            for (const doc of esqlResult.documents) {
              switch (doc.case) {
                case 'missing':
                  // NOTE that ES|QL returns null for an ignored but mapped field, whereas ingest simply doesn't add the field
                  expect(ingestResult[1]['log.level']).toBeUndefined();
                  expect(doc['log.level']).toBeNull();
                  break;
                case 'dissected':
                  expect(ingestResult[0]['log.level']).toEqual('info');
                  expect(doc['log.level']).toBe('info');
                  break;
              }
            }
          }
        );
      });

      // TODO: Implement
      streamlangApiTest(
        'should nullify undissected fields in the doc when only partial dissection is possible',
        async ({ testBed, esql }) => {}
      );

      // TODO: Implement
      streamlangApiTest(
        'should not nullify existing fields when no dissection is possible',
        async ({ testBed, esql }) => {}
      );

      // TODO: Implement
      streamlangApiTest(
        'should leave the source field intact if not present in pattern',
        async ({ testBed, esql }) => {}
      );
    });

    streamlangApiTest(
      'should fail in ingest when field is missing and ignore_missing is false but ES|QL ignores the document',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'dissect',
              from: 'message',
              pattern: '[%{@timestamp}] [%{log.level}] %{client.ip}',
              ignore_missing: false,
            } as DissectProcessor,
          ],
        };

        const { processors } = asIngest(streamlangDSL);
        const { query } = asEsql(streamlangDSL);

        const docs = [{ case: 'missing', log: { level: 'info' } }];
        const { errors } = await testBed.ingest('ingest-dissect-fail', docs, processors);
        expect(errors[0].reason).toContain('field [message] not present as part of path [message]');

        const mappingDoc = { message: '' };
        await testBed.ingest('esql-dissect-fail', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-dissect-fail', query);
        expect(esqlResult.documentsWithoutKeywords.length).toBe(2);
        expect(
          // Filtering is needed as ES|QL's FORK may return documents in different order
          esqlResult.documentsWithoutKeywords.filter((d) => d.case === 'missing')[0].message
        ).toBeNull();
      }
    );
  }
);
