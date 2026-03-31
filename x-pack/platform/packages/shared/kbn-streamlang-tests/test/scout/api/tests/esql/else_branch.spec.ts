/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
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
        const docs = [
          { attributes: { status: 'active' } },
          { attributes: { status: 'inactive' } },
        ];
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
  }
);
