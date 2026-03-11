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

    apiTest('should correctly cast extracted values to integer type', async ({ testBed, esql }) => {
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
    });

    apiTest('should correctly cast extracted values to boolean type', async ({ testBed, esql }) => {
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
    });

    apiTest('should correctly cast extracted values to double type', async ({ testBed, esql }) => {
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
    });

    apiTest('should default to keyword type when no type specified', async ({ testBed, esql }) => {
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
    });

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
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-json-extract-multi-types'
        );

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
        expect(esqlResult.documents.length).toBeGreaterThan(0);
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

    // *** Additional Edge Case Tests ***

    apiTest('should correctly cast extracted values to long type', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'big_number', target_field: 'big_number', type: 'long' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: '{"big_number": 9007199254740992}' }];
      await testBed.ingest('ingest-json-extract-long', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-long');

      await testBed.ingest('esql-json-extract-long', docs);
      const esqlResult = await esql.queryOnIndex('esql-json-extract-long', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ big_number: 9007199254740992 })
      );
    });

    apiTest(
      'should correctly extract using bracket notation selectors',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: "['user']['profile']['name']", target_field: 'user_name' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"user": {"profile": {"name": "Alice"}}}' }];
        await testBed.ingest('ingest-json-extract-bracket', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-bracket');

        await testBed.ingest('esql-json-extract-bracket', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-bracket', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ user_name: 'Alice' }));
      }
    );

    apiTest(
      'should correctly extract deeply nested fields (5+ levels)',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [
                {
                  selector: 'level1.level2.level3.level4.level5.value',
                  target_field: 'deep_value',
                },
              ],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          {
            message:
              '{"level1": {"level2": {"level3": {"level4": {"level5": {"value": "found"}}}}}}',
          },
        ];
        await testBed.ingest('ingest-json-extract-deep', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-deep');

        await testBed.ingest('esql-json-extract-deep', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-deep', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ deep_value: 'found' }));
      }
    );

    apiTest('should correctly extract empty string values', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'empty_field', target_field: 'empty_field' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: '{"empty_field": ""}' }];
      await testBed.ingest('ingest-json-extract-empty', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-empty');

      await testBed.ingest('esql-json-extract-empty', docs);
      const esqlResult = await esql.queryOnIndex('esql-json-extract-empty', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ empty_field: '' }));
    });

    apiTest(
      'should correctly extract boolean false without converting to null',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'is_active', target_field: 'is_active', type: 'boolean' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"is_active": false}' }];
        await testBed.ingest('ingest-json-extract-false', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-false');

        await testBed.ingest('esql-json-extract-false', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-false', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ is_active: false }));
      }
    );

    apiTest(
      'should correctly extract zero integer without treating as falsy',
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

        const docs = [{ message: '{"count": 0}' }];
        await testBed.ingest('ingest-json-extract-zero', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-zero');

        await testBed.ingest('esql-json-extract-zero', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-zero', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ count: 0 }));
      }
    );

    apiTest(
      'should correctly extract negative numbers with double type',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [
                { selector: 'temperature', target_field: 'temperature', type: 'double' },
              ],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"temperature": -42.5}' }];
        await testBed.ingest('ingest-json-extract-neg', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-neg');

        await testBed.ingest('esql-json-extract-neg', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-neg', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ temperature: -42.5 }));
      }
    );

    apiTest(
      'should correctly extract second array element with [1] selector',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'items[1]', target_field: 'second_item' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"items": ["first", "second", "third"]}' }];
        await testBed.ingest('ingest-json-extract-arr1', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-arr1');

        await testBed.ingest('esql-json-extract-arr1', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-arr1', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ second_item: 'second' }));
      }
    );

    apiTest(
      'should correctly extract values with unicode characters',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'greeting', target_field: 'greeting' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"greeting": "こんにちは世界 🌍"}' }];
        await testBed.ingest('ingest-json-extract-unicode', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-unicode');

        await testBed.ingest('esql-json-extract-unicode', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-unicode', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(
          expect.objectContaining({ greeting: 'こんにちは世界 🌍' })
        );
      }
    );

    apiTest(
      'should correctly extract from multiple documents in batch',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'id', target_field: 'extracted_id', type: 'integer' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { message: '{"id": 1}', order: 1 },
          { message: '{"id": 2}', order: 2 },
          { message: '{"id": 3}', order: 3 },
        ];
        await testBed.ingest('ingest-json-extract-batch', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-batch');

        await testBed.ingest('esql-json-extract-batch', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-batch', query);

        expect(ingestResult).toHaveLength(3);
        expect(esqlResult.documentsWithoutKeywords).toHaveLength(3);

        const ingestSorted = [...ingestResult].sort((a: any, b: any) => a.order - b.order);
        const esqlSorted = [...esqlResult.documentsWithoutKeywords].sort(
          (a: any, b: any) => a.order - b.order
        );

        expect(ingestSorted).toStrictEqual(esqlSorted);
        expect(ingestSorted[0]).toStrictEqual(expect.objectContaining({ extracted_id: 1 }));
        expect(ingestSorted[1]).toStrictEqual(expect.objectContaining({ extracted_id: 2 }));
        expect(ingestSorted[2]).toStrictEqual(expect.objectContaining({ extracted_id: 3 }));
      }
    );

    apiTest('should correctly coerce string number to integer', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'string_num', target_field: 'parsed_num', type: 'integer' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: '{"string_num": "42"}' }];
      await testBed.ingest('ingest-json-extract-str2int', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-str2int');

      await testBed.ingest('esql-json-extract-str2int', docs);
      const esqlResult = await esql.queryOnIndex('esql-json-extract-str2int', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ parsed_num: 42 }));
    });

    apiTest('should correctly coerce string "true" to boolean', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [
              { selector: 'string_bool', target_field: 'parsed_bool', type: 'boolean' },
            ],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: '{"string_bool": "true"}' }];
      await testBed.ingest('ingest-json-extract-str2bool', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-str2bool');

      await testBed.ingest('esql-json-extract-str2bool', docs);
      const esqlResult = await esql.queryOnIndex('esql-json-extract-str2bool', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ parsed_bool: true }));
    });

    apiTest(
      'should handle ignore_missing: true when field value is null',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'value', target_field: 'value' }],
              ignore_missing: true,
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        // Note: ES|QL requires the column to exist in the index schema, so we include
        // a mapping document with an empty message field. Documents with null/missing
        // message values should be handled by ignore_missing: true.
        const mappingDoc = { message: '{}' };
        const docs = [{ other_field: 'no message field here' }];
        await testBed.ingest('ingest-json-extract-ignmiss', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-ignmiss');

        await testBed.ingest('esql-json-extract-ignmiss', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-ignmiss', query);

        // Filter out the mapping document from ES|QL results
        const esqlDocsWithoutMapping = esqlResult.documentsWithoutKeywords.filter(
          (d: any) => d.other_field
        );

        // Behavioral difference: Ingest Pipeline doesn't add fields that don't exist,
        // while ES|QL returns null for columns that exist in schema but have no value.
        // Both preserve the original document content (other_field) and don't add the
        // extracted value when the source field is missing/null.
        expect(ingestResult[0].other_field).toStrictEqual(esqlDocsWithoutMapping[0].other_field);
        expect(ingestResult[0].value).toBeUndefined();
        // ES|QL returns null for the value column (schema exists but extraction returns null)
        expect(esqlDocsWithoutMapping[0].value).toBeNull();
      }
    );

    apiTest(
      'should correctly extract with mixed bracket and dot notation',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [
                { selector: "data['nested'].items[0].value", target_field: 'extracted' },
              ],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"data": {"nested": {"items": [{"value": "found"}]}}}' }];
        await testBed.ingest('ingest-json-extract-mixed', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-mixed');

        await testBed.ingest('esql-json-extract-mixed', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-mixed', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ extracted: 'found' }));
      }
    );

    apiTest('should correctly extract null JSON value', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'nullable', target_field: 'nullable' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: '{"nullable": null}' }];
      await testBed.ingest('ingest-json-extract-null', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-null');

      await testBed.ingest('esql-json-extract-null', docs);
      const esqlResult = await esql.queryOnIndex('esql-json-extract-null', query);

      expect(ingestResult[0].nullable).toBeUndefined();
      expect(esqlResult.documentsWithoutKeywords[0].nullable).toBeNull();
    });

    apiTest('should correctly extract scientific notation numbers', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'scientific', target_field: 'scientific', type: 'double' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: '{"scientific": 1.23e4}' }];
      await testBed.ingest('ingest-json-extract-sci', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-sci');

      await testBed.ingest('esql-json-extract-sci', docs);
      const esqlResult = await esql.queryOnIndex('esql-json-extract-sci', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ scientific: 12300 }));
    });
  }
);
