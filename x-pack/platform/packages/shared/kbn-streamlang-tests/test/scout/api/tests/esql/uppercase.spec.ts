/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { StreamlangDSL, UppercaseProcessor } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Uppercase Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should uppercase a field in place', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-uppercase-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uppercase',
            from: 'message',
          } as UppercaseProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: 'test message 1' }, { message: 'test message 2' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message).toBe('TEST MESSAGE 1');
      expect(esqlResult.documents[1]?.message).toBe('TEST MESSAGE 2');
    });

    apiTest('should uppercase a field into a target field', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-uppercase-to-target';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uppercase',
            from: 'message',
            to: 'message_upper',
          } as UppercaseProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: 'test message 1' }, { message: 'test message 2' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message_upper).toBe('TEST MESSAGE 1');
      expect(esqlResult.documents[1]?.message_upper).toBe('TEST MESSAGE 2');
    });

    apiTest('should uppercase a field with a where condition', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-uppercase-to-target-with-where';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'uppercase',
            from: 'message',
            where: {
              field: 'should_uppercase',
              eq: 'yes',
            },
          } as UppercaseProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [
        { message: 'test message 1', should_uppercase: 'yes' },
        { message: 'test message 2', should_uppercase: 'no' },
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(2);
      expect(esqlResult.documents[0]?.message).toBe('TEST MESSAGE 1');
      expect(esqlResult.documents[1]?.message).toBe('test message 2');
    });

    apiTest(
      'should uppercase a field into a target field with a where condition',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-uppercase-to-target-with-where';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'uppercase',
              from: 'message',
              to: 'message_upper',
              where: {
                field: 'should_uppercase',
                eq: 'yes',
              },
            } as UppercaseProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        const docs = [
          { message: 'test message 1', should_uppercase: 'yes' },
          { message: 'test message 2', should_uppercase: 'no' },
        ];
        await testBed.ingest(indexName, docs);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        expect(esqlResult.documents).toHaveLength(2);
        expect(esqlResult.documents[0]?.message_upper).toBe('TEST MESSAGE 1');
        expect(esqlResult.documents[1]?.message_upper).toBeNull();
      }
    );
  }
);
