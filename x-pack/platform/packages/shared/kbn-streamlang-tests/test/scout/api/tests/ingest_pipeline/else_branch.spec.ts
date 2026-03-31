/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { addDeterministicCustomIdentifiers, stripCustomIdentifiers } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { asDoc } from '../../fixtures/doc_utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Else Branch',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'should execute if-branch steps when condition matches and else-branch steps when it does not',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-else-branch-ingest';

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

        const { processors } = await transpile(streamlangDSL);

        const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocsOrdered(indexName);

        // Active doc should get 'success'
        expect(asDoc(asDoc(ingestedDocs[0])?.attributes)?.outcome).toBe('success');

        // Inactive doc should get 'failure' (else branch)
        expect(asDoc(asDoc(ingestedDocs[1])?.attributes)?.outcome).toBe('failure');
      }
    );

    apiTest('should execute multiple steps in else branch', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-else-multi-ingest';

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

      const { processors } = await transpile(streamlangDSL);

      const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocsOrdered(indexName);

      // Active doc: only outcome set
      expect(asDoc(asDoc(ingestedDocs[0])?.attributes)?.outcome).toBe('success');

      // Inactive doc: both outcome and reason set by else branch
      expect(asDoc(asDoc(ingestedDocs[1])?.attributes)?.outcome).toBe('failure');
      expect(asDoc(asDoc(ingestedDocs[1])?.attributes)?.reason).toBe('not_active');
    });

    apiTest(
      'should produce same results after round-tripping through identifier utilities',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-else-roundtrip-ingest';

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

        const { processors: origProcessors } = await transpile(originalDSL);
        const { processors: rtProcessors } = await transpile(stripped);

        const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];

        await testBed.ingest(`${indexName}-orig`, docs, origProcessors);
        await testBed.ingest(`${indexName}-rt`, docs, rtProcessors);

        const origDocs = await testBed.getDocsOrdered(`${indexName}-orig`);
        const rtDocs = await testBed.getDocsOrdered(`${indexName}-rt`);

        // Results should match
        expect(asDoc(asDoc(origDocs[0])?.attributes)?.outcome).toBe(
          asDoc(asDoc(rtDocs[0])?.attributes)?.outcome
        );
        expect(asDoc(asDoc(origDocs[1])?.attributes)?.outcome).toBe(
          asDoc(asDoc(rtDocs[1])?.attributes)?.outcome
        );
      }
    );
  }
);
