/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { DateProcessor, StreamlangDSL } from '../../../../..';
import { transpile as asIngest } from '../../../../../src/transpilers/ingest_pipeline';
import { transpile as asEsql } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Cross-compatibility - Date Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest.describe('Compatible', () => {
      streamlangApiTest('should parse a date with a single format', async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'date',
              from: 'log.time',
              formats: ['ISO8601'],
            } as DateProcessor,
          ],
        };

        const { processors } = asIngest(streamlangDSL);
        const { query } = asEsql(streamlangDSL);

        const docs = [{ log: { time: '2025-01-01T12:34:56.789Z' } }];
        await testBed.ingest('ingest-date-single-format', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-date-single-format');

        await testBed.ingest('esql-date-single-format', docs);
        const esqlResult = await esql.queryOnIndex('esql-date-single-format', query);

        expect(ingestResult[0]['@timestamp']).toEqual('2025-01-01T12:34:56.789Z');
        expect(esqlResult.documents[0]['@timestamp']).toEqual('2025-01-01T12:34:56.789Z');
      });

      streamlangApiTest('should parse a date with multiple formats', async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'date',
              from: 'event.created',
              to: 'event.created_date',
              formats: ['dd/MM/yyyy:HH:mm:ss', 'ISO8601'],
            } as DateProcessor,
          ],
        };

        const { processors } = asIngest(streamlangDSL);
        const { query } = asEsql(streamlangDSL);

        const docs = [
          { event: { created: '01/01/2025:12:34:56' } },
          { event: { created: '2025-01-02T12:34:56.789Z' } },
        ];
        await testBed.ingest('ingest-date-multiple-formats', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-date-multiple-formats');

        await testBed.ingest('esql-date-multiple-formats', docs);
        const esqlResult = await esql.queryOnIndex('esql-date-multiple-formats', query);

        expect(ingestResult[0].event.created_date).toEqual('2025-01-01T12:34:56.000Z');
        expect(ingestResult[1].event.created_date).toEqual('2025-01-02T12:34:56.789Z');
        expect(esqlResult.documents[0]['event.created_date']).toEqual('2025-01-01T12:34:56.000Z');
        expect(esqlResult.documents[1]['event.created_date']).toEqual('2025-01-02T12:34:56.789Z');
      });

      streamlangApiTest('should use a different output format', async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'date',
              from: 'log.time',
              formats: ['ISO8601'],
              output_format: 'yyyy/MM/dd',
            } as DateProcessor,
          ],
        };

        const { processors } = asIngest(streamlangDSL);
        const { query } = asEsql(streamlangDSL);

        const docs = [{ log: { time: '2025-01-01T12:34:56.789Z' } }];
        await testBed.ingest('ingest-date-output-format', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-date-output-format');

        await testBed.ingest('esql-date-output-format', docs);
        const esqlResult = await esql.queryOnIndex('esql-date-output-format', query);

        expect(ingestResult[0]['@timestamp']).toEqual('2025/01/01');
        expect(esqlResult.documents[0]['@timestamp']).toEqual('2025/01/01');
      });

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
      ].forEach(({ templateLabel, templateType, from, to }) => {
        streamlangApiTest(
          `should consistently handle ${templateType} template syntax for from and to fields`,
          async ({ testBed, esql }) => {
            const streamlangDSL: StreamlangDSL = {
              steps: [
                {
                  action: 'date',
                  from,
                  to,
                  formats: ['ISO8601'],
                  output_format: 'yyyy/MM/dd',
                } as DateProcessor,
              ],
            };

            const { processors } = asIngest(streamlangDSL);
            const { query } = asEsql(streamlangDSL);

            // Create a document with the literal template strings as fields and the fields they would (should not) substitute to
            const docs = [
              {
                [from]: '2025-01-01T12:34:56.789Z',
                template_from: 'source.field', // Should not be substituted
                template_to: 'target.field', // Should not be substituted
              },
            ];

            await testBed.ingest(`ingest-date-template-${templateLabel}`, docs, processors);
            const ingestResult = await testBed.getDocs(`ingest-date-template-${templateLabel}`);

            await testBed.ingest(`esql-date-template-${templateLabel}`, docs);
            const esqlResult = await esql.queryOnIndex(
              `esql-date-template-${templateLabel}`,
              query
            );

            // Both engines should treat the templates as literal values, not as template variables to substitute
            expect(ingestResult[0]).toHaveProperty(to, '2025/01/01');
            expect(ingestResult[0]).toHaveProperty('template_from', 'source.field');
            expect(ingestResult[0]).toHaveProperty('template_to', 'target.field');

            expect(esqlResult.documents[0]).toEqual(
              expect.objectContaining({ [to]: '2025/01/01' })
            );
            expect(esqlResult.documents[0]).toHaveProperty('template_from', 'source.field');
            expect(esqlResult.documents[0]).toHaveProperty('template_to', 'target.field');
          }
        );
      });

      // TODO: Implement compatibility test with multiple input date formats
      streamlangApiTest(
        'should parse the first matching among a list of input formats',
        async ({ testBed, esql }) => {
          //
        }
      );
    });

    streamlangApiTest.describe('Incompatible', () => {
      streamlangApiTest(
        'should add error in ingest, but ES|QL ignores the document when parsing fails',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'date',
                from: 'log.time',
                formats: ['yyyy/MM/dd'],
              } as DateProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ log: { time: '01-01-2025' } }];
          const { errors } = await testBed.ingest('ingest-date-fail', docs, processors);
          expect(errors[0].reason).toContain('unable to parse date');

          await testBed.ingest('esql-date-fail', docs);
          const esqlResult = await esql.queryOnIndex('esql-date-fail', query);
          expect(esqlResult.documents.length).toEqual(1);
          expect(esqlResult.documents[0]['log.time']).toEqual('01-01-2025'); // Unchanged
        }
      );
    });
  }
);
