/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { AppendProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

// Does not support templated value
apiTest.describe(
  'Streamlang to ES|QL - Append Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should append a value to an existing field', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-append';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['new_tag'],
          } as AppendProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [{ tags: ['existing_tag'] }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents[0].tags).toStrictEqual(['existing_tag', 'new_tag']);
    });

    apiTest('should append a value to a non-existent field', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-append-non-existent';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['tag01', 'tag02'],
          } as AppendProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const mappingDoc = { tags: ['initial_tag'] }; // Needed to satisfy ES|QL which needs all operand columns pre-mapped;
      const docs = [mappingDoc, { message: 'message' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documentsOrdered[1].tags).toStrictEqual(['tag01', 'tag02']);
    });

    apiTest(
      'should not append duplicate values when allow_duplicates is false',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-append-no-duplicates';
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'append',
              to: 'tags',
              value: ['existing_tag', 'existing_tag'],
              allow_duplicates: false,
            } as AppendProcessor,
          ],
        };
        const { query } = transpile(streamlangDSL);
        const docs = [{ tags: ['existing_tag', 'new_tag'] }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);
        expect(esqlResult.documents[0].tags).toStrictEqual(['existing_tag', 'new_tag']);
      }
    );

    apiTest(
      'should append duplicate values when allow_duplicates is true',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-append-duplicates';
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'append',
              to: 'tags',
              value: ['existing_tag'],
              allow_duplicates: true,
            } as AppendProcessor,
          ],
        };
        const { query } = transpile(streamlangDSL);
        const docs = [{ tags: ['existing_tag'] }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);
        expect(esqlResult.documents[0].tags).toStrictEqual(['existing_tag', 'existing_tag']);
      }
    );

    apiTest('should not append a value when where is false', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-append-where-false';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['new_tag'],
            where: {
              field: 'attributes.should_exist',
              exists: true,
            },
          } as AppendProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        { attributes: { should_exist: 'YES' }, tags: ['existing_tag'] },
        { attributes: { size: 2048 }, tags: ['existing_tag_01', 'existing_tag_02'] },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documentsOrdered[0].tags).toStrictEqual(['existing_tag', 'new_tag']);
      expect(esqlResult.documentsOrdered[1].tags).toStrictEqual([
        'existing_tag_01',
        'existing_tag_02',
      ]);
    });

    apiTest(
      'results in a scalar (single value) when dedupe outputs a single value',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-append-scalar-dedupe';
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'append',
              to: 'tags',
              value: ['existing_tag', 'existing_tag'],
              allow_duplicates: false,
            } as AppendProcessor,
          ],
        };
        const { query } = transpile(streamlangDSL);
        const docs = [{ tags: ['existing_tag'] }];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // Note how an ES|QL single element multi-valued field outputs a non-array value
        expect(esqlResult.documents[0].tags).toBe('existing_tag');
      }
    );

    apiTest('should support nested where with not', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-append-where-not';
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['new_tag'],
            where: {
              not: {
                field: 'attributes.should_exist',
                exists: true,
              },
            },
          } as AppendProcessor,
        ],
      };
      const { query } = transpile(streamlangDSL);
      const docs = [
        { attributes: { should_exist: 'YES' }, tags: ['existing_tag'] },
        { attributes: { size: 2048 }, tags: ['existing_tag_01', 'existing_tag_02'] },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);
      expect(esqlResult.documentsOrdered[0].tags).toBe('existing_tag');
      expect(esqlResult.documentsOrdered[1].tags).toStrictEqual([
        'existing_tag_01',
        'existing_tag_02',
        'new_tag',
      ]);
    });

    apiTest('should reject Mustache template syntax {{ and {{{', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: '{{my.list}}',
            value: ['{{{template.value}}}'],
          } as AppendProcessor,
        ],
      };

      // Should throw validation error for Mustache templates
      expect(() => transpile(streamlangDSL)).toThrow(
        'Mustache template syntax {{ }} or {{{ }}} is not allowed'
      );
    });
  }
);
