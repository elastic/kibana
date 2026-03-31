/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import {
  transpileEsql as transpile,
  addDeterministicCustomIdentifiers,
  stripCustomIdentifiers,
} from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Else Branch',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'should execute if-branch steps when condition matches and else-branch steps when it does not',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-else-branch-esql';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              condition: {
                field: 'attributes.status',
                eq: 'active',
                steps: [
                  {
                    action: 'set',
                    to: 'attributes.outcome',
                    value: 'success',
                  } as SetProcessor,
                ],
                else: [
                  {
                    action: 'set',
                    to: 'attributes.outcome',
                    value: 'failure',
                  } as SetProcessor,
                ],
              },
            },
          ],
        };

        const { query } = await transpile(streamlangDSL);

        const mappingDoc = { attributes: { status: 'null', outcome: 'null' } };
        const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];
        await testBed.ingest(indexName, [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex(indexName, query);

        // Active doc should get 'success'
        expect(esqlResult.documentsOrdered[1]).toStrictEqual(
          expect.objectContaining({
            'attributes.status': 'active',
            'attributes.outcome': 'success',
          })
        );

        // Inactive doc should get 'failure' (else branch)
        expect(esqlResult.documentsOrdered[2]).toStrictEqual(
          expect.objectContaining({
            'attributes.status': 'inactive',
            'attributes.outcome': 'failure',
          })
        );
      }
    );

    apiTest('should execute multiple steps in else branch', async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-else-multi-esql';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            condition: {
              field: 'attributes.status',
              eq: 'active',
              steps: [
                {
                  action: 'set',
                  to: 'attributes.outcome',
                  value: 'success',
                } as SetProcessor,
              ],
              else: [
                {
                  action: 'set',
                  to: 'attributes.outcome',
                  value: 'failure',
                } as SetProcessor,
                {
                  action: 'set',
                  to: 'attributes.reason',
                  value: 'not_active',
                } as SetProcessor,
              ],
            },
          },
        ],
      };

      const { query } = await transpile(streamlangDSL);

      const mappingDoc = {
        attributes: { status: 'null', outcome: 'null', reason: 'null' },
      };
      const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];
      await testBed.ingest(indexName, [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Active doc: only outcome set
      expect(esqlResult.documentsOrdered[1]).toStrictEqual(
        expect.objectContaining({
          'attributes.outcome': 'success',
        })
      );

      // Inactive doc: both outcome and reason set by else branch
      expect(esqlResult.documentsOrdered[2]).toStrictEqual(
        expect.objectContaining({
          'attributes.outcome': 'failure',
          'attributes.reason': 'not_active',
        })
      );
    });

    apiTest(
      'should produce same results after round-tripping through identifier utilities',
      async ({ testBed, esql }) => {
        const indexName = 'stream-e2e-test-else-roundtrip-esql';

        const originalDSL: StreamlangDSL = {
          steps: [
            {
              condition: {
                field: 'attributes.status',
                eq: 'active',
                steps: [
                  {
                    action: 'set',
                    to: 'attributes.outcome',
                    value: 'success',
                  } as SetProcessor,
                ],
                else: [
                  {
                    action: 'set',
                    to: 'attributes.outcome',
                    value: 'failure',
                  } as SetProcessor,
                ],
              },
            },
          ],
        };

        // Round-trip through addDeterministicCustomIdentifiers and stripCustomIdentifiers
        const withIds = addDeterministicCustomIdentifiers(originalDSL);
        const stripped = stripCustomIdentifiers(withIds);

        // Both the original and the round-tripped DSL should produce the same results
        const { query: originalQuery } = await transpile(originalDSL);
        const { query: roundTrippedQuery } = await transpile(stripped);

        const mappingDoc = { attributes: { status: 'null', outcome: 'null' } };
        const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];

        await testBed.ingest(`${indexName}-orig`, [mappingDoc, ...docs]);
        await testBed.ingest(`${indexName}-rt`, [mappingDoc, ...docs]);

        const origResult = await esql.queryOnIndex(`${indexName}-orig`, originalQuery);
        const rtResult = await esql.queryOnIndex(`${indexName}-rt`, roundTrippedQuery);

        // Results should match
        expect(origResult.documentsOrdered[1]).toStrictEqual(rtResult.documentsOrdered[1]);
        expect(origResult.documentsOrdered[2]).toStrictEqual(rtResult.documentsOrdered[2]);
      }
    );
  }
);
