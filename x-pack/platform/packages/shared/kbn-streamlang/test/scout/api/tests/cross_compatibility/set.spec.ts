/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '../../../../..';
import { transpile as asIngest } from '../../../../../src/transpilers/ingest_pipeline';
import { transpile as asEsql } from '../../../../../src/transpilers/esql';
import { streamlangApiTest } from '../..';

streamlangApiTest.describe(
  'Cross-compatibility - Set Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    streamlangApiTest.describe('Compatible', () => {
      streamlangApiTest('should set a field using a value', async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.status',
              value: 'active',
            } as SetProcessor,
          ],
        };

        const { processors } = asIngest(streamlangDSL);
        const { query } = asEsql(streamlangDSL);

        const docs = [{ attributes: { size: 4096 } }];
        await testBed.ingest('ingest-set-value', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-set-value');

        await testBed.ingest('esql-set-value', docs);
        const esqlResult = await esql.queryOnIndex('esql-set-value', query);

        expect(ingestResult[0]).toHaveProperty('attributes.status', 'active');
        expect(esqlResult.documents[0]).toEqual(
          expect.objectContaining({ 'attributes.status': 'active' })
        );
      });

      streamlangApiTest(
        'should set a field by copying from another field',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'set',
                to: 'attributes.status',
                copy_from: 'message',
              } as SetProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ message: 'should-be-copied' }];
          await testBed.ingest('ingest-set-copy', docs, processors);
          const ingestResult = await testBed.getDocs('ingest-set-copy');

          await testBed.ingest('esql-set-copy', docs);
          const esqlResult = await esql.queryOnIndex('esql-set-copy', query);

          expect(ingestResult[0]).toHaveProperty('attributes.status', 'should-be-copied');
          expect(esqlResult.documents[0]).toEqual(
            expect.objectContaining({ 'attributes.status': 'should-be-copied' })
          );
        }
      );

      streamlangApiTest(
        'should override an existing field when override is true',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'set',
                to: 'attributes.status',
                value: 'inactive',
                override: true,
              } as SetProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ attributes: { status: 'active' } }];
          await testBed.ingest('ingest-set-override', docs, processors);
          const ingestResult = await testBed.getDocs('ingest-set-override');

          await testBed.ingest('esql-set-override', docs);
          const esqlResult = await esql.queryOnIndex('esql-set-override', query);

          expect(ingestResult[0]).toHaveProperty('attributes.status', 'inactive');
          expect(esqlResult.documents[0]).toEqual(
            expect.objectContaining({ 'attributes.status': 'inactive' })
          );
        }
      );

      streamlangApiTest(
        'should not override in ingest as well as in ES|QL when override is false',
        async ({ testBed, esql }) => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'set',
                to: 'attributes.status',
                value: 'inactive',
                override: false,
              } as SetProcessor,
            ],
          };

          const { processors } = asIngest(streamlangDSL);
          const { query } = asEsql(streamlangDSL);

          const docs = [{ attributes: { status: 'active' } }];
          await testBed.ingest('ingest-set-no-override', docs, processors);
          const ingestResult = await testBed.getDocs('ingest-set-no-override');

          await testBed.ingest('esql-set-no-override', docs);
          const esqlResult = await esql.queryOnIndex('esql-set-no-override', query);

          expect(ingestResult[0]).toHaveProperty('attributes.status', 'active');
          expect(esqlResult.documents[0]).toEqual(
            expect.objectContaining({ 'attributes.status': 'active' })
          );
        }
      );

      // Template validation tests - both transpilers should consistently REJECT Mustache templates
      [
        {
          templateLabel: 'double-braces',
          templateType: '{{ }}',
          value: '{{template_value}}',
          to: '{{template_field}}',
        },
        {
          templateLabel: 'triple-braces',
          templateType: '{{{ }}}',
          value: '{{{template_value}}}',
          to: '{{{template_field}}}',
        },
      ].forEach(({ templateLabel, templateType, value, to }) => {
        streamlangApiTest(
          `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
          async () => {
            const streamlangDSL: StreamlangDSL = {
              steps: [
                {
                  action: 'set',
                  to,
                  value,
                } as SetProcessor,
              ],
            };

            // Both transpilers should throw validation errors for Mustache templates
            expect(() => asIngest(streamlangDSL)).toThrow(); // Ingest Pipeline transpiler should reject
            expect(() => asEsql(streamlangDSL)).toThrow(); // ES|QL transpiler should reject
          }
        );
      });
    });

    // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
    // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.
    streamlangApiTest.describe('Incompatible', () => {});
  }
);
