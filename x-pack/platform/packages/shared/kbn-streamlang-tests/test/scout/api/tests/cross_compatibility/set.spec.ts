/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Set Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // *** Compatible Cases ***
    apiTest('should set a field using a value', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.status',
            value: 'active',
          } as SetProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ attributes: { size: 4096 } }];
      await testBed.ingest('ingest-set-value', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-set-value');

      await testBed.ingest('esql-set-value', docs);
      const esqlResult = await esql.queryOnIndex('esql-set-value', query);

      expect(ingestResult[0]?.attributes?.status).toBe('active');
      expect(esqlResult.documentsOrdered[0]).toStrictEqual(
        expect.objectContaining({ 'attributes.status': 'active' })
      );
    });

    apiTest('should set a field by copying from another field', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.status',
            copy_from: 'message',
          } as SetProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: 'should-be-copied' }];
      await testBed.ingest('ingest-set-copy', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-set-copy');

      await testBed.ingest('esql-set-copy', docs);
      const esqlResult = await esql.queryOnIndex('esql-set-copy', query);

      expect(ingestResult[0]?.attributes?.status).toBe('should-be-copied');
      expect(esqlResult.documentsOrdered[0]).toStrictEqual(
        expect.objectContaining({ 'attributes.status': 'should-be-copied' })
      );
    });

    apiTest(
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ attributes: { status: 'active' } }];
        await testBed.ingest('ingest-set-override', docs, processors);
        const ingestResult = await testBed.getDocsOrdered('ingest-set-override');

        await testBed.ingest('esql-set-override', docs);
        const esqlResult = await esql.queryOnIndex('esql-set-override', query);

        expect(ingestResult[0]?.attributes?.status).toBe('inactive');
        expect(esqlResult.documentsOrdered[0]).toStrictEqual(
          expect.objectContaining({ 'attributes.status': 'inactive' })
        );
      }
    );

    apiTest(
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

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ attributes: { status: 'active' } }];
        await testBed.ingest('ingest-set-no-override', docs, processors);
        const ingestResult = await testBed.getDocsOrdered('ingest-set-no-override');

        await testBed.ingest('esql-set-no-override', docs);
        const esqlResult = await esql.queryOnIndex('esql-set-no-override', query);

        expect(ingestResult[0]?.attributes?.status).toBe('active');
        expect(esqlResult.documentsOrdered[0]).toStrictEqual(
          expect.objectContaining({ 'attributes.status': 'active' })
        );
      }
    );

    // Template validation tests - both transpilers should consistently REJECT Mustache templates
    [
      {
        templateType: '{{ }}',
        value: '{{template_value}}',
        to: '{{template_field}}',
      },
      {
        templateType: '{{{ }}}',
        value: '{{{template_value}}}',
        to: '{{{template_field}}}',
      },
    ].forEach(({ templateType, value, to }) => {
      apiTest(
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
          expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed'
          );
          expect(() => transpileEsql(streamlangDSL)).toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed'
          );
        }
      );
    });

    // *** Incompatible / Partially Compatible Cases ***
    // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
    // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.
  }
);
