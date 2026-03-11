/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { JsonExtractProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - JsonExtract Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    // *** Compatible Cases ***
    apiTest(
      'should correctly extract a simple field from JSON string',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'user_id', target_field: 'user_id' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"user_id": "abc123"}' }];
        await testBed.ingest('ingest-json-extract-basic', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-basic');

        await testBed.ingest('esql-json-extract-basic', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-basic', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ user_id: 'abc123' }));
      }
    );

    apiTest(
      'should correctly extract multiple fields from JSON string',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [
                { selector: 'user_id', target_field: 'user_id' },
                { selector: 'status', target_field: 'event_status' },
              ],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"user_id": "abc123", "status": "active"}' }];
        await testBed.ingest('ingest-json-extract-multi', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-multi');

        await testBed.ingest('esql-json-extract-multi', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-multi', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(
          expect.objectContaining({
            user_id: 'abc123',
            event_status: 'active',
          })
        );
      }
    );

    apiTest(
      'should correctly extract nested fields using dot notation',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'metadata.client.ip', target_field: 'client_ip' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"metadata": {"client": {"ip": "192.168.1.1"}}}' }];
        await testBed.ingest('ingest-json-extract-nested', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-nested');

        await testBed.ingest('esql-json-extract-nested', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-nested', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(
          expect.objectContaining({ client_ip: '192.168.1.1' })
        );
      }
    );

    apiTest(
      'should support conditional extraction with where clause',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'user_id', target_field: 'user_id' }],
              where: {
                field: 'should_extract',
                eq: 'yes',
              },
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { message: '{"user_id": "abc123"}', should_extract: 'yes' },
          { message: '{"user_id": "xyz789"}', should_extract: 'no' },
        ];
        await testBed.ingest('ingest-json-extract-conditional', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-json-extract-conditional'
        );

        await testBed.ingest('esql-json-extract-conditional', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-conditional', query);

        expect(ingestResult).toHaveLength(2);
        expect(esqlResult.documents).toHaveLength(2);

        const ingestDoc1 = ingestResult.find((d: any) => d.should_extract === 'yes');
        const ingestDoc2 = ingestResult.find((d: any) => d.should_extract === 'no');
        const esqlDoc1 = esqlResult.documentsWithoutKeywords.find(
          (d: any) => d.should_extract === 'yes'
        );
        const esqlDoc2 = esqlResult.documentsWithoutKeywords.find(
          (d: any) => d.should_extract === 'no'
        );

        expect(ingestDoc1).toStrictEqual(esqlDoc1);
        expect(ingestDoc1).toStrictEqual(expect.objectContaining({ user_id: 'abc123' }));

        expect(ingestDoc2?.user_id).toBeUndefined();
        expect(esqlDoc2?.user_id).toBeNull();
      }
    );

    // *** Template validation tests ***
    [
      {
        templateType: '{{ }}',
        field: '{{template_field}}',
      },
      {
        templateType: '{{{ }}}',
        field: '{{{template_field}}}',
      },
    ].forEach(({ templateType, field }) => {
      apiTest(
        `should consistently reject ${templateType} template syntax in both Ingest Pipeline and ES|QL transpilers`,
        async () => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'json_extract',
                field,
                extractions: [{ selector: 'user_id', target_field: 'user.id' }],
              } as JsonExtractProcessor,
            ],
          };

          expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
          );
          expect(() => transpileEsql(streamlangDSL)).toThrow(
            'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
          );
        }
      );
    });

    // *** Type Casting Tests ***

    apiTest(
      'should correctly cast extracted values to integer type',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'count', target_field: 'count', type: 'integer' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"count": 42}' }];
        await testBed.ingest('ingest-json-extract-int', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-int');

        await testBed.ingest('esql-json-extract-int', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-int', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ count: 42 }));
      }
    );

    apiTest(
      'should correctly cast extracted values to boolean type',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'active', target_field: 'active', type: 'boolean' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"active": true}' }];
        await testBed.ingest('ingest-json-extract-bool', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-bool');

        await testBed.ingest('esql-json-extract-bool', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-bool', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ active: true }));
      }
    );

    apiTest(
      'should correctly cast extracted values to double type',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'price', target_field: 'price', type: 'double' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"price": 19.99}' }];
        await testBed.ingest('ingest-json-extract-double', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-double');

        await testBed.ingest('esql-json-extract-double', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-double', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ price: 19.99 }));
      }
    );

    apiTest(
      'should default to keyword type when no type specified',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'name', target_field: 'name' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"name": "John"}' }];
        await testBed.ingest('ingest-json-extract-default', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-default');

        await testBed.ingest('esql-json-extract-default', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-default', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ name: 'John' }));
      }
    );

    apiTest(
      'should correctly cast multiple extractions with different types',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [
                { selector: 'count', target_field: 'count', type: 'integer' },
                { selector: 'active', target_field: 'active', type: 'boolean' },
                { selector: 'name', target_field: 'name', type: 'keyword' },
              ],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"count": 42, "active": true, "name": "Test"}' }];
        await testBed.ingest('ingest-json-extract-multi-types', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-multi-types');

        await testBed.ingest('esql-json-extract-multi-types', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-multi-types', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(
          expect.objectContaining({
            count: 42,
            active: true,
            name: 'Test',
          })
        );
      }
    );

    // *** Incompatible / Partially Compatible Cases ***

    apiTest(
      'should handle invalid JSON differently between transpilers',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'user_id', target_field: 'user_id' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const invalidJsonDocs = [{ message: 'not valid json' }];

        // NOTE: BEHAVIORAL DIFFERENCE - Invalid JSON handling
        // Ingest Pipeline: Script throws error when JSON parsing fails
        // ES|QL: JSON_EXTRACT returns null for invalid JSON
        const { errors } = await testBed.ingest(
          'ingest-json-extract-fail',
          invalidJsonDocs,
          processors
        );
        expect(errors.length).toBeGreaterThan(0);

        const validJsonDoc = { message: '{"user_id": "abc"}' };
        await testBed.ingest('esql-json-extract-fail', [validJsonDoc, ...invalidJsonDocs]);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-fail', query);
        // ES|QL query should include both documents but only the valid one has a value
        expect(esqlResult.documents.length >= 1).toBe(true);
      }
    );

    apiTest(
      'should handle array index extraction in both transpilers',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'items[0].name', target_field: 'first_item' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"items": [{"name": "Apple"}, {"name": "Banana"}]}' }];
        await testBed.ingest('ingest-json-extract-array', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-array');

        await testBed.ingest('esql-json-extract-array', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-array', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ first_item: 'Apple' }));
      }
    );
  }
);
