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
  transpileIngestPipeline,
  transpileEsql,
  addDeterministicCustomIdentifiers,
  stripCustomIdentifiers,
} from '@kbn/streamlang';
import { asDoc } from '../../fixtures/doc_utils';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Cross-compatibility - Else Branch',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'should execute if-branch when condition matches and else-branch when it does not',
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

        await testBed.ingest('ingest-else', docs, processors);
        const ingestResult = await testBed.getDocsOrdered('ingest-else');

        await testBed.ingest('esql-else', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-else', query);

        expect(asDoc(asDoc(ingestResult[0])?.attributes)?.outcome).toBe('success');
        expect(asDoc(asDoc(ingestResult[1])?.attributes)?.outcome).toBe('failure');

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

    apiTest('should execute multiple steps in else branch', async ({ testBed, esql }) => {
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

      const { processors } = await transpileIngestPipeline(streamlangDSL);
      const { query } = await transpileEsql(streamlangDSL);

      const mappingDoc = {
        attributes: { status: 'null', outcome: 'null', reason: 'null' },
      };
      const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];

      await testBed.ingest('ingest-else-multi', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-else-multi');

      await testBed.ingest('esql-else-multi', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-else-multi', query);

      // Active doc: only outcome set
      expect(asDoc(asDoc(ingestResult[0])?.attributes)?.outcome).toBe('success');
      expect(esqlResult.documentsOrdered[1]).toStrictEqual(
        expect.objectContaining({ 'attributes.outcome': 'success' })
      );

      // Inactive doc: both outcome and reason set by else branch
      expect(asDoc(asDoc(ingestResult[1])?.attributes)?.outcome).toBe('failure');
      expect(asDoc(asDoc(ingestResult[1])?.attributes)?.reason).toBe('not_active');
      expect(esqlResult.documentsOrdered[2]).toStrictEqual(
        expect.objectContaining({
          'attributes.outcome': 'failure',
          'attributes.reason': 'not_active',
        })
      );
    });

    apiTest(
      'documents with missing condition field: ingest else-branch fires, esql excludes from both branches',
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
                    value: 'if_branch',
                  } as SetProcessor,
                ],
                else: [
                  {
                    action: 'set',
                    to: 'attributes.outcome',
                    value: 'else_branch',
                  } as SetProcessor,
                ],
              },
            },
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const mappingDoc = { attributes: { status: 'null', outcome: 'null' } };
        const docs = [
          { attributes: { status: 'active' } },
          { attributes: { status: 'inactive' } },
          // Document with missing condition field — exposes transpiler divergence
          { attributes: { other: 'value' } },
        ];

        await testBed.ingest('ingest-else-missing', docs, processors);
        const ingestResult = await testBed.getDocsOrdered('ingest-else-missing');

        await testBed.ingest('esql-else-missing', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-else-missing', query);

        // Active doc: if-branch fires in both transpilers
        expect(asDoc(asDoc(ingestResult[0])?.attributes)?.outcome).toBe('if_branch');
        expect(esqlResult.documentsOrdered[1]).toStrictEqual(
          expect.objectContaining({ 'attributes.outcome': 'if_branch' })
        );

        // Inactive doc: else-branch fires in both transpilers
        expect(asDoc(asDoc(ingestResult[1])?.attributes)?.outcome).toBe('else_branch');
        expect(esqlResult.documentsOrdered[2]).toStrictEqual(
          expect.objectContaining({ 'attributes.outcome': 'else_branch' })
        );

        // Missing-field doc: KNOWN DIVERGENCE between transpilers
        // Painless: null check makes inner condition false, NOT(false) = true → else fires
        expect(asDoc(asDoc(ingestResult[2])?.attributes)?.outcome).toBe('else_branch');
        // ES|QL: NULL propagation means NOT(NULL) = NULL → neither branch fires, outcome stays null
        expect(esqlResult.documentsOrdered[3]).toStrictEqual(
          expect.objectContaining({ 'attributes.outcome': null })
        );
      }
    );

    apiTest('should handle nested conditions inside else branch', async ({ testBed, esql }) => {
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
                  value: 'active',
                } as SetProcessor,
              ],
              else: [
                {
                  condition: {
                    field: 'attributes.status',
                    eq: 'pending',
                    steps: [
                      {
                        action: 'set',
                        to: 'attributes.outcome',
                        value: 'pending',
                      } as SetProcessor,
                    ],
                    else: [
                      {
                        action: 'set',
                        to: 'attributes.outcome',
                        value: 'unknown',
                      } as SetProcessor,
                    ],
                  },
                },
              ],
            },
          },
        ],
      };

      const { processors } = await transpileIngestPipeline(streamlangDSL);
      const { query } = await transpileEsql(streamlangDSL);

      const mappingDoc = { attributes: { status: 'null', outcome: 'null' } };
      const docs = [
        { attributes: { status: 'active' } },
        { attributes: { status: 'pending' } },
        { attributes: { status: 'inactive' } },
      ];

      await testBed.ingest('ingest-nested-else', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-nested-else');

      await testBed.ingest('esql-nested-else', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-nested-else', query);

      // Active → 'active' (if-branch fires)
      expect(asDoc(asDoc(ingestResult[0])?.attributes)?.outcome).toBe('active');
      expect(esqlResult.documentsOrdered[1]).toStrictEqual(
        expect.objectContaining({ 'attributes.outcome': 'active' })
      );

      // Pending → 'pending' (else-branch, then nested if-branch fires)
      expect(asDoc(asDoc(ingestResult[1])?.attributes)?.outcome).toBe('pending');
      expect(esqlResult.documentsOrdered[2]).toStrictEqual(
        expect.objectContaining({ 'attributes.outcome': 'pending' })
      );

      // Inactive → 'unknown' (else-branch, then nested else-branch fires)
      expect(asDoc(asDoc(ingestResult[2])?.attributes)?.outcome).toBe('unknown');
      expect(esqlResult.documentsOrdered[3]).toStrictEqual(
        expect.objectContaining({ 'attributes.outcome': 'unknown' })
      );
    });

    apiTest(
      'should handle if-else inside an else branch with multiple steps',
      async ({ testBed, esql }) => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              condition: {
                field: 'attributes.priority',
                eq: 'high',
                steps: [
                  {
                    action: 'set',
                    to: 'attributes.level',
                    value: '1',
                  } as SetProcessor,
                ],
                else: [
                  {
                    action: 'set',
                    to: 'attributes.level',
                    value: '2',
                  } as SetProcessor,
                  {
                    condition: {
                      field: 'attributes.priority',
                      eq: 'low',
                      steps: [
                        {
                          action: 'set',
                          to: 'attributes.tag',
                          value: 'deprioritized',
                        } as SetProcessor,
                      ],
                      else: [
                        {
                          action: 'set',
                          to: 'attributes.tag',
                          value: 'normal',
                        } as SetProcessor,
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };

        const { processors } = await transpileIngestPipeline(streamlangDSL);
        const { query } = await transpileEsql(streamlangDSL);

        const mappingDoc = {
          attributes: { priority: 'null', level: 'null', tag: 'null' },
        };
        const docs = [
          { attributes: { priority: 'high' } },
          { attributes: { priority: 'low' } },
          { attributes: { priority: 'medium' } },
        ];

        await testBed.ingest('ingest-else-nested-multi', docs, processors);
        const ingestResult = await testBed.getDocsOrdered('ingest-else-nested-multi');

        await testBed.ingest('esql-else-nested-multi', [mappingDoc, ...docs]);
        const esqlResult = await esql.queryOnIndex('esql-else-nested-multi', query);

        // High priority → level=1, no tag set
        expect(asDoc(asDoc(ingestResult[0])?.attributes)?.level).toBe('1');
        expect(esqlResult.documentsOrdered[1]).toStrictEqual(
          expect.objectContaining({ 'attributes.level': '1' })
        );

        // Low priority → level=2, tag=deprioritized
        expect(asDoc(asDoc(ingestResult[1])?.attributes)?.level).toBe('2');
        expect(asDoc(asDoc(ingestResult[1])?.attributes)?.tag).toBe('deprioritized');
        expect(esqlResult.documentsOrdered[2]).toStrictEqual(
          expect.objectContaining({
            'attributes.level': '2',
            'attributes.tag': 'deprioritized',
          })
        );

        // Medium priority → level=2, tag=normal
        expect(asDoc(asDoc(ingestResult[2])?.attributes)?.level).toBe('2');
        expect(asDoc(asDoc(ingestResult[2])?.attributes)?.tag).toBe('normal');
        expect(esqlResult.documentsOrdered[3]).toStrictEqual(
          expect.objectContaining({
            'attributes.level': '2',
            'attributes.tag': 'normal',
          })
        );
      }
    );

    apiTest(
      'should produce same results after round-tripping through identifier utilities',
      async ({ testBed, esql }) => {
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

        const withIds = addDeterministicCustomIdentifiers(originalDSL);
        const stripped = stripCustomIdentifiers(withIds);

        const { processors: origProcessors } = await transpileIngestPipeline(originalDSL);
        const { processors: rtProcessors } = await transpileIngestPipeline(stripped);
        const { query: originalQuery } = await transpileEsql(originalDSL);
        const { query: roundTrippedQuery } = await transpileEsql(stripped);

        const mappingDoc = { attributes: { status: 'null', outcome: 'null' } };
        const docs = [{ attributes: { status: 'active' } }, { attributes: { status: 'inactive' } }];

        await testBed.ingest('ingest-else-rt-orig', docs, origProcessors);
        await testBed.ingest('ingest-else-rt-rt', docs, rtProcessors);
        const origIngest = await testBed.getDocsOrdered('ingest-else-rt-orig');
        const rtIngest = await testBed.getDocsOrdered('ingest-else-rt-rt');

        await testBed.ingest('esql-else-rt-orig', [mappingDoc, ...docs]);
        await testBed.ingest('esql-else-rt-rt', [mappingDoc, ...docs]);
        const origEsql = await esql.queryOnIndex('esql-else-rt-orig', originalQuery);
        const rtEsql = await esql.queryOnIndex('esql-else-rt-rt', roundTrippedQuery);

        // Ingest results should match after round-trip
        expect(asDoc(asDoc(origIngest[0])?.attributes)?.outcome).toBe(
          asDoc(asDoc(rtIngest[0])?.attributes)?.outcome
        );
        expect(asDoc(asDoc(origIngest[1])?.attributes)?.outcome).toBe(
          asDoc(asDoc(rtIngest[1])?.attributes)?.outcome
        );

        // ESQL results should match after round-trip
        expect(origEsql.documentsOrdered[1]).toStrictEqual(rtEsql.documentsOrdered[1]);
        expect(origEsql.documentsOrdered[2]).toStrictEqual(rtEsql.documentsOrdered[2]);
      }
    );
  }
);
