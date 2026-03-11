/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { JsonExtractProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - JsonExtract Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should extract a simple field from JSON string', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'user_id', target_field: 'user.id' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"user_id": "abc123"}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getFlattenedDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ 'user.id': 'abc123', message: '{"user_id": "abc123"}' })
      );
    });

    apiTest('should extract multiple fields from JSON string', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-multiple';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [
              { selector: 'user_id', target_field: 'user.id' },
              { selector: 'status', target_field: 'event.status' },
            ],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"user_id": "abc123", "status": "active"}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getFlattenedDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({
          'user.id': 'abc123',
          'event.status': 'active',
        })
      );
    });

    apiTest('should extract nested fields using dot notation', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-nested';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'metadata.client.ip', target_field: 'client_ip' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"metadata": {"client": {"ip": "192.168.1.1"}}}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(expect.objectContaining({ client_ip: '192.168.1.1' }));
    });

    apiTest('should extract using $ root selector', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-root';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: '$.user.name', target_field: 'username' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"user": {"name": "John"}}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(expect.objectContaining({ username: 'John' }));
    });

    apiTest('should extract array element by index', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-array';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'items[0].name', target_field: 'first_item' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"items": [{"name": "Apple"}, {"name": "Banana"}]}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(expect.objectContaining({ first_item: 'Apple' }));
    });

    apiTest('should extract using bracket notation', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-bracket';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: "['user']['address']['city']", target_field: 'city' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"user": {"address": {"city": "Seattle"}}}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(expect.objectContaining({ city: 'Seattle' }));
    });

    apiTest('should preserve numeric types from JSON', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-numeric';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [
              { selector: 'count', target_field: 'count' },
              { selector: 'price', target_field: 'price' },
            ],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"count": 42, "price": 19.99}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(expect.objectContaining({ count: 42, price: 19.99 }));
    });

    apiTest('should preserve boolean types from JSON', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-boolean';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [
              { selector: 'active', target_field: 'is_active' },
              { selector: 'verified', target_field: 'is_verified' },
            ],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"active": true, "verified": false}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ is_active: true, is_verified: false })
      );
    });

    apiTest('should fail if JSON parsing fails on invalid JSON', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-fail-invalid';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'user_id', target_field: 'user.id' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: 'not valid json' }];
      const { errors } = await testBed.ingest(indexName, docs, processors);
      expect(errors).toHaveLength(1);
    });

    apiTest(
      'should ignore missing source field when ignore_missing is true',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-json-extract-ignore-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'nonexistent',
              extractions: [{ selector: 'user_id', target_field: 'user.id' }],
              ignore_missing: true,
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [{ message: 'some_value' }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0];
        expect(source).toStrictEqual(expect.objectContaining({ message: 'some_value' }));
        expect((source as Record<string, unknown>).user).toBeUndefined();
      }
    );

    apiTest('should not set target field when selector path not found', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-not-found';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'nonexistent.path', target_field: 'result' }],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ message: '{"user": "test"}' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect((ingestedDocs[0] as Record<string, unknown>).result).toBeUndefined();
    });

    apiTest('should extract conditionally with where condition', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-conditional';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [{ selector: 'user_id', target_field: 'user_id' }],
            where: {
              field: 'event.kind',
              eq: 'test',
            },
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { message: '{"user_id": "abc123"}', event: { kind: 'test' } },
        { message: '{"user_id": "xyz789"}', event: { kind: 'production' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getFlattenedDocs(indexName);
      expect(ingestedDocs).toHaveLength(2);

      const doc1 = ingestedDocs.find((d: any) => d['event.kind'] === 'test');
      expect(doc1).toStrictEqual(
        expect.objectContaining({ user_id: 'abc123', 'event.kind': 'test' })
      );

      const doc2 = ingestedDocs.find((d: any) => d['event.kind'] === 'production');
      expect((doc2 as Record<string, unknown>).user_id).toBeUndefined();
    });

    apiTest('should handle complex JSON with mixed types', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-json-extract-complex';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'message',
            extractions: [
              { selector: 'user.name', target_field: 'username' },
              { selector: 'tags[1]', target_field: 'second_tag' },
              { selector: 'metadata.count', target_field: 'count' },
            ],
          } as JsonExtractProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          message:
            '{"user": {"name": "Alice"}, "tags": ["a", "b", "c"], "metadata": {"count": 100}}',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({
          username: 'Alice',
          second_tag: 'b',
          count: 100,
        })
      );
    });

    [
      {
        templateField: 'host.{{field_name}}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateField: 'host.{{{field_name}}}',
        description: 'should reject {{{ }}} template syntax in field names',
      },
    ].forEach(({ templateField, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: templateField,
              extractions: [{ selector: 'user_id', target_field: 'user.id' }],
            } as JsonExtractProcessor,
          ],
        };

        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      });
    });
  }
);
