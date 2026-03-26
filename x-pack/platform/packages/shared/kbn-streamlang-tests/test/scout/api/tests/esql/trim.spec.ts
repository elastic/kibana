/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { StreamlangDSL, TrimProcessor } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Trim Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should trim a field in place', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-trim-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'trim',
            from: 'message',
          } as TrimProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: '   test message 1   ' }, { message: '   test message 2   ' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message).toBe('test message 1');
      expect(esqlResult.documents[1]?.message).toBe('test message 2');
    });

    apiTest('should trim a field into a target field', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-trim-to-target';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'trim',
            from: 'message',
            to: 'message_trimmed',
          } as TrimProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: '   test message 1   ' }, { message: '   test message 2   ' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message_trimmed).toBe('test message 1');
      expect(esqlResult.documents[1]?.message_trimmed).toBe('test message 2');
    });

    apiTest('should trim a field with a where condition', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-trim-to-target-with-where';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'trim',
            from: 'message',
            where: {
              field: 'should_trim',
              eq: 'yes',
            },
          } as TrimProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [
        { message: '   test message 1   ', should_trim: 'yes' },
        { message: '   test message 2   ', should_trim: 'no' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message).toBe('test message 1');
      expect(esqlResult.documents[1]?.message).toBe('   test message 2   ');
    });

    apiTest(
      'should trim a field into a target field with a where condition',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-trim-to-target-with-where';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'trim',
              from: 'message',
              to: 'message_trimmed',
              where: {
                field: 'should_trim',
                eq: 'yes',
              },
            } as TrimProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [
          { message: '   test message 1   ', should_trim: 'yes' },
          { message: '   test message 2   ', should_trim: 'no' },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.documents[0]?.message_trimmed).toBe('test message 1');
        expect(esqlResult.documents[1]?.message_trimmed).toBeNull();
      }
    );
  }
);
