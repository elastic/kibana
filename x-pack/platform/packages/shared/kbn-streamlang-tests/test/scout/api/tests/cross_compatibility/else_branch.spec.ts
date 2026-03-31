/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { asDoc } from '../../fixtures/doc_utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Else Branch',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'should produce same results for else branch in both ESQL and Ingest Pipeline',
      async ({ testBed, esql }) => {
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

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const mappingDoc = { attributes: { status: 'null', outcome: 'null' } };
        const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];

        // Test ingest pipeline
        await testBed.ingest('ingest-else', docs, processors);
        const ingestResult = await testBed.getDocsOrdered('ingest-else');

        // Test ESQL
        await testBed.ingest('esql-else', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-else', query);

        // Verify ingest pipeline results
        expect(asDoc(asDoc(ingestResult[0])?.attributes)?.outcome).toBe('success');
        expect(asDoc(asDoc(ingestResult[1])?.attributes)?.outcome).toBe('failure');

        // Verify ESQL results match
        expect(esqlResult.documentsOrdered[1]).toStrictEqual(
          expect.objectContaining({
            'attributes.status': 'active',
            'attributes.outcome': 'success',
          })
        );
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
