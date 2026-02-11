/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { LowercaseProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Lowercase Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should lowercase a field in place', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-lowercase-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'lowercase',
            from: 'message',
          } as LowercaseProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: 'TEST MESSAGE 1' }, { message: 'TEST MESSAGE 2' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message).toBe('test message 1');
      expect(esqlResult.documents[1]?.message).toBe('test message 2');
    });

    apiTest('should lowercase a field into a target field', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-lowercase-to-target';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'lowercase',
            from: 'message',
            to: 'message_lowercase',
          } as LowercaseProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: 'TEST MESSAGE 1' }, { message: 'TEST MESSAGE 2' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message_lowercase).toBe('test message 1');
      expect(esqlResult.documents[1]?.message_lowercase).toBe('test message 2');
    });

    apiTest('should lowercase a field with a where condition', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-lowercase-to-target-with-where';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'lowercase',
            from: 'message',
            where: {
              field: 'should_lowercase',
              eq: 'yes',
            },
          } as LowercaseProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [
        { message: 'TEST MESSAGE 1', should_lowercase: 'yes' },
        { message: 'TEST MESSAGE 2', should_lowercase: 'no' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message).toBe('test message 1');
      expect(esqlResult.documents[1]?.message).toBe('TEST MESSAGE 2');
    });

    apiTest(
      'should lowercase a field into a target field with a where condition',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-lowercase-to-target-with-where';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'lowercase',
              from: 'message',
              to: 'message_lowercase',
              where: {
                field: 'should_lowercase',
                eq: 'yes',
              },
            } as LowercaseProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [
          { message: 'TEST MESSAGE 1', should_lowercase: 'yes' },
          { message: 'TEST MESSAGE 2', should_lowercase: 'no' },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.documents[0]?.message_lowercase).toBe('test message 1');
        expect(esqlResult.documents[1]?.message_lowercase).toBeNull();
      }
    );
  }
);
