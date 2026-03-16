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
    // *** Basic Extraction Tests ***
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

    // *** JSON path validation tests ***
    [
      { selector: 'a..b', error: 'consecutive dots' },
      { selector: 'a.', error: 'path cannot end with a dot' },
      { selector: '.a', error: 'path cannot start with a dot' },
      { selector: 'a[]', error: 'empty brackets' },
      { selector: '$.....xyz', error: 'path cannot start with a dot' },
      { selector: "$['unclosed", error: 'unterminated quoted key' },
      { selector: 'a[01]', error: 'leading zeros are not allowed' },
    ].forEach(({ selector, error }) => {
      apiTest(
        `should consistently reject invalid selector "${selector}" in both transpilers`,
        async () => {
          const streamlangDSL: StreamlangDSL = {
            steps: [
              {
                action: 'json_extract',
                field: 'message',
                extractions: [{ selector, target_field: 'extracted' }],
              } as JsonExtractProcessor,
            ],
          };

          expect(() => transpileIngestPipeline(streamlangDSL)).toThrow(error);
          expect(() => transpileEsql(streamlangDSL)).toThrow(error);
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

    apiTest('should extract using $ root selector', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: '$.user.name', target_field: 'username' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ message: '{"user": {"name": "John"}}' }];
      await testBed.ingest('ingest-json-extract-root', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-root');

      await testBed.ingest('esql-json-extract-root', docs);
      const esqlResult = await esql.queryOnIndex('esql-json-extract-root', query);

      expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
      expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ username: 'John' }));
    });

    apiTest(
      'should not set target field when selector path not found',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'nonexistent.path', target_field: 'result' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"user": "test"}' }];
        await testBed.ingest('ingest-json-extract-notfound', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-notfound');

        await testBed.ingest('esql-json-extract-notfound', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-notfound', query);

        expect(ingestResult[0].result).toBeUndefined();
        expect(esqlResult.documentsWithoutKeywords[0].result).toBeNull();
      }
    );

    // *** Overwriting Original Field Tests ***
    apiTest(
      'should correctly extract to same field as source (overwrite original)',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'value', target_field: 'message' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"value": "extracted"}' }];
        await testBed.ingest('ingest-json-extract-overwrite', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-overwrite');

        await testBed.ingest('esql-json-extract-overwrite', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-overwrite', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ message: 'extracted' }));
      }
    );

    apiTest(
      'should correctly extract integer to same field as source (type change)',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'count', target_field: 'message', type: 'integer' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [{ message: '{"count": 42}' }];
        await testBed.ingest('ingest-json-extract-overwrite-int', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-json-extract-overwrite-int'
        );

        await testBed.ingest('esql-json-extract-overwrite-int', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-overwrite-int', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(expect.objectContaining({ message: 42 }));
      }
    );

    // *** Conditional Processing Tests ***
    apiTest(
      'should apply conditional extraction only to matching documents',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'data', target_field: 'extracted_data' }],
              where: {
                field: 'type',
                eq: 'process',
              },
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { message: '{"data": "processed"}', type: 'process', order: 1 },
          { message: '{"data": "skipped"}', type: 'skip', order: 2 },
          { message: '{"data": "also_processed"}', type: 'process', order: 3 },
        ];
        await testBed.ingest('ingest-json-extract-cond-multi', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-json-extract-cond-multi'
        );

        await testBed.ingest('esql-json-extract-cond-multi', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-cond-multi', query);

        expect(ingestResult).toHaveLength(3);

        const ingestDoc1 = ingestResult.find((d: any) => d.order === 1);
        const ingestDoc2 = ingestResult.find((d: any) => d.order === 2);
        const ingestDoc3 = ingestResult.find((d: any) => d.order === 3);

        const esqlDoc1 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 1);
        const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 2);
        const esqlDoc3 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 3);

        expect(ingestDoc1!.extracted_data).toBe('processed');
        expect(esqlDoc1!.extracted_data).toBe('processed');

        expect(ingestDoc2!.extracted_data).toBeUndefined();
        expect(esqlDoc2!.extracted_data).toBeNull();

        expect(ingestDoc3!.extracted_data).toBe('also_processed');
        expect(esqlDoc3!.extracted_data).toBe('also_processed');
      }
    );

    apiTest(
      'should apply conditional extraction with integer type casting',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'count', target_field: 'count', type: 'integer' }],
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
          { message: '{"count": 100}', should_extract: 'yes', order: 1 },
          { message: '{"count": 200}', should_extract: 'no', order: 2 },
        ];
        await testBed.ingest('ingest-json-extract-cond-int', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-cond-int');

        await testBed.ingest('esql-json-extract-cond-int', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-cond-int', query);

        const ingestDoc1 = ingestResult.find((d: any) => d.order === 1);
        const ingestDoc2 = ingestResult.find((d: any) => d.order === 2);

        const esqlDoc1 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 1);
        const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 2);

        expect(ingestDoc1!.count).toBe(100);
        expect(esqlDoc1!.count).toBe(100);

        expect(ingestDoc2!.count).toBeUndefined();
        expect(esqlDoc2!.count).toBeNull();
      }
    );

    apiTest(
      'should apply conditional extraction with boolean type casting',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'active', target_field: 'is_active', type: 'boolean' }],
              where: {
                field: 'process',
                eq: 'true',
              },
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { message: '{"active": true}', process: 'true', order: 1 },
          { message: '{"active": false}', process: 'false', order: 2 },
        ];
        await testBed.ingest('ingest-json-extract-cond-bool', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-cond-bool');

        await testBed.ingest('esql-json-extract-cond-bool', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-cond-bool', query);

        const ingestDoc1 = ingestResult.find((d: any) => d.order === 1);
        const ingestDoc2 = ingestResult.find((d: any) => d.order === 2);

        const esqlDoc1 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 1);
        const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 2);

        expect(ingestDoc1!.is_active).toBe(true);
        expect(esqlDoc1!.is_active).toBe(true);

        expect(ingestDoc2!.is_active).toBeUndefined();
        expect(esqlDoc2!.is_active).toBeNull();
      }
    );

    apiTest(
      'should conditionally extract multiple fields with different types',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [
                { selector: 'name', target_field: 'user_name' },
                { selector: 'age', target_field: 'user_age', type: 'integer' },
                { selector: 'active', target_field: 'user_active', type: 'boolean' },
              ],
              where: {
                field: 'extract',
                eq: 'yes',
              },
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { message: '{"name": "Alice", "age": 30, "active": true}', extract: 'yes', order: 1 },
          { message: '{"name": "Bob", "age": 25, "active": false}', extract: 'no', order: 2 },
        ];
        await testBed.ingest('ingest-json-extract-cond-multi-type', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-json-extract-cond-multi-type'
        );

        await testBed.ingest('esql-json-extract-cond-multi-type', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-cond-multi-type', query);

        const ingestDoc1 = ingestResult.find((d: any) => d.order === 1);
        const ingestDoc2 = ingestResult.find((d: any) => d.order === 2);

        const esqlDoc1 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 1);
        const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 2);

        expect(ingestDoc1!.user_name).toBe('Alice');
        expect(ingestDoc1!.user_age).toBe(30);
        expect(ingestDoc1!.user_active).toBe(true);

        expect(esqlDoc1!.user_name).toBe('Alice');
        expect(esqlDoc1!.user_age).toBe(30);
        expect(esqlDoc1!.user_active).toBe(true);

        expect(ingestDoc2!.user_name).toBeUndefined();
        expect(ingestDoc2!.user_age).toBeUndefined();
        expect(ingestDoc2!.user_active).toBeUndefined();

        expect(esqlDoc2!.user_name).toBeNull();
        expect(esqlDoc2!.user_age).toBeNull();
        expect(esqlDoc2!.user_active).toBeNull();
      }
    );

    // *** Conditional Overwriting Original Field Tests ***
    apiTest(
      'should conditionally overwrite original field with extracted value',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'simplified', target_field: 'message' }],
              where: {
                field: 'simplify',
                eq: 'yes',
              },
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          { message: '{"simplified": "short_value"}', simplify: 'yes', order: 1 },
          { message: '{"simplified": "keep_original"}', simplify: 'no', order: 2 },
        ];
        await testBed.ingest('ingest-json-extract-cond-overwrite', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered(
          'ingest-json-extract-cond-overwrite'
        );

        await testBed.ingest('esql-json-extract-cond-overwrite', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-cond-overwrite', query);

        const ingestDoc1 = ingestResult.find((d: any) => d.order === 1);
        const ingestDoc2 = ingestResult.find((d: any) => d.order === 2);

        const esqlDoc1 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 1);
        const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 2);

        expect(ingestDoc1!.message).toBe('short_value');
        expect(esqlDoc1!.message).toBe('short_value');

        expect(ingestDoc2!.message).toBe('{"simplified": "keep_original"}');
        expect(esqlDoc2!.message).toBe('{"simplified": "keep_original"}');
      }
    );

    apiTest('should handle nested field conditional extraction', async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'user.profile.email', target_field: 'email' }],
            where: {
              field: 'extract_email',
              eq: 'yes',
            },
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [
        {
          message: '{"user": {"profile": {"email": "alice@example.com"}}}',
          extract_email: 'yes',
          order: 1,
        },
        {
          message: '{"user": {"profile": {"email": "bob@example.com"}}}',
          extract_email: 'no',
          order: 2,
        },
      ];
      await testBed.ingest('ingest-json-extract-cond-nested', docs, processors);
      const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-cond-nested');

      await testBed.ingest('esql-json-extract-cond-nested', docs);
      const esqlResult = await esql.queryOnIndex('esql-json-extract-cond-nested', query);

      const ingestDoc1 = ingestResult.find((d: any) => d.order === 1);
      const ingestDoc2 = ingestResult.find((d: any) => d.order === 2);

      const esqlDoc1 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 1);
      const esqlDoc2 = esqlResult.documentsWithoutKeywords.find((d: any) => d.order === 2);

      expect(ingestDoc1!.email).toBe('alice@example.com');
      expect(esqlDoc1!.email).toBe('alice@example.com');

      expect(ingestDoc2!.email).toBeUndefined();
      expect(esqlDoc2!.email).toBeNull();
    });

    // *** Complex JSON Extraction Tests ***
    apiTest(
      'should handle complex JSON with mixed types and array access',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [
                { selector: 'user.name', target_field: 'username' },
                { selector: 'tags[1]', target_field: 'second_tag' },
                { selector: 'metadata.count', target_field: 'count', type: 'integer' },
              ],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { query } = transpileEsql(streamlangDSL);

        const docs = [
          {
            message:
              '{"user": {"name": "Alice"}, "tags": ["a", "b", "c"], "metadata": {"count": 100}}',
          },
        ];
        await testBed.ingest('ingest-json-extract-complex', docs, processors);
        const ingestResult = await testBed.getFlattenedDocsOrdered('ingest-json-extract-complex');

        await testBed.ingest('esql-json-extract-complex', docs);
        const esqlResult = await esql.queryOnIndex('esql-json-extract-complex', query);

        expect(ingestResult[0]).toStrictEqual(esqlResult.documentsWithoutKeywords[0]);
        expect(ingestResult[0]).toStrictEqual(
          expect.objectContaining({
            username: 'Alice',
            second_tag: 'b',
            count: 100,
          })
        );
      }
    );
  }
);
