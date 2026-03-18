/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RemoveByPrefixProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - RemoveByPrefix Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'should remove nested fields in both ingest pipeline and ES|QL',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              from: 'host',
            } as RemoveByPrefixProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          {
            host: {
              name: 'server01',
              ip: '192.168.1.1',
            },
            message: 'keep-this',
          },
        ];

        await testBed.ingest('ingest-remove-by-prefix-nested', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-remove-by-prefix-nested');

        await testBed.ingest('esql-remove-by-prefix-nested', docs);
        const esqlResult = await esql.queryOnIndex('esql-remove-by-prefix-nested', query);

        // Both remove the parent field and all nested fields
        expect(ingestResult[0]?.host).toBeUndefined();
        expect(ingestResult[0]?.['host.name']).toBeUndefined();
        expect(ingestResult[0]?.['host.ip']).toBeUndefined();
        expect(ingestResult[0]?.message).toBe('keep-this');

        // ES|QL also removes the parent field when all nested fields are removed
        expect(esqlResult.documents[0]).toStrictEqual(
          expect.objectContaining({ message: 'keep-this' })
        );
        expect(esqlResult.columnNames).not.toContain('host.name');
        expect(esqlResult.columnNames).not.toContain('host.ip');
        expect(esqlResult.columnNames).not.toContain('host');
      }
    );

    apiTest(
      'should handle flattened field structure in both transpilers',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              from: 'labels',
            } as RemoveByPrefixProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          {
            'labels.env': 'production',
            'labels.team': 'platform',
            message: 'keep-this',
          },
        ];

        await testBed.ingest('ingest-remove-by-prefix-flattened', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-remove-by-prefix-flattened');

        await testBed.ingest('esql-remove-by-prefix-flattened', docs);
        const esqlResult = await esql.queryOnIndex('esql-remove-by-prefix-flattened', query);

        // Both should remove the nested fields
        expect(ingestResult[0]?.['labels.env']).toBeUndefined();
        expect(ingestResult[0]?.['labels.team']).toBeUndefined();
        expect(esqlResult.columnNames).not.toContain('labels.env');
        expect(esqlResult.columnNames).not.toContain('labels.team');

        // Both should keep the message
        expect(ingestResult[0]?.message).toBe('keep-this');
        expect(esqlResult.documents[0]).toStrictEqual(
          expect.objectContaining({ message: 'keep-this' })
        );
      }
    );

    // Template validation tests - both transpilers should consistently REJECT Mustache templates
    [
      {
        templateType: '{{ }}',
        fieldName: '{{field_name}}',
      },
      {
        templateType: '{{{ }}}',
        fieldName: '{{{field_name}}}',
      },
    ].forEach(({ templateType, fieldName }) => {
      apiTest(
        `should consistently reject ${templateType} template syntax in both transpilers`,
        async () => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'remove_by_prefix',
                from: fieldName,
              } as RemoveByPrefixProcessor,
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

    apiTest(
      'should consistently remove parent field and nested fields',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              from: 'metadata',
            } as RemoveByPrefixProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          {
            metadata: {
              timestamp: '2025-01-01',
              host: 'server01',
            },
            message: 'test',
          },
        ];

        await testBed.ingest('ingest-remove-by-prefix-parent', docs, processors);
        const ingestResult = await testBed.getDocs('ingest-remove-by-prefix-parent');

        await testBed.ingest('esql-remove-by-prefix-parent', docs);
        const esqlResult = await esql.queryOnIndex('esql-remove-by-prefix-parent', query);

        // Both behave the same: remove the parent field and all nested fields
        expect(ingestResult[0]?.metadata).toBeUndefined();
        expect(ingestResult[0]?.['metadata.timestamp']).toBeUndefined();
        expect(ingestResult[0]?.['metadata.host']).toBeUndefined();

        expect(esqlResult.columnNames).not.toContain('metadata');
        expect(esqlResult.columnNames).not.toContain('metadata.timestamp');
        expect(esqlResult.columnNames).not.toContain('metadata.host');
      }
    );
  }
);
