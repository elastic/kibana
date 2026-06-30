/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { JsonExtractProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

/**
 * Ingest Pipeline-specific JsonExtract Processor Tests
 *
 * These tests document Ingest Pipeline-specific behaviors that differ from ES|QL:
 * - Invalid JSON causes ingestion failure (script error)
 * - Missing source field behavior with ignore_missing: true (no field added vs null)
 *
 * For tests that verify identical behavior between transpilers, see:
 * cross_compatibility/json_extract.spec.ts
 */
apiTest.describe(
  'Streamlang to Ingest Pipeline - JsonExtract Processor (Ingest Pipeline-specific)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'should fail ingestion when JSON parsing fails (Ingest Pipeline-specific error handling)',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-json-extract-ingest-fail';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'message',
              extractions: [{ selector: 'user_id', target_field: 'user.id' }],
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = await transpile(streamlangDSL);

        const docs = [{ message: 'not valid json' }];
        const { errors } = await testBed.ingest(indexName, docs, processors);
        expect(errors).toHaveLength(1);
      }
    );

    apiTest(
      'should not add target field when source field is missing with ignore_missing: true (Ingest Pipeline-specific)',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-json-extract-ingest-missing';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'nonexistent',
              extractions: [{ selector: 'user_id', target_field: 'user_id' }],
              ignore_missing: true,
            } as JsonExtractProcessor,
          ],
        };

        const { processors } = await transpile(streamlangDSL);

        const docs = [{ message: 'some_value' }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0] as Record<string, unknown>;
        expect(source).toStrictEqual(expect.objectContaining({ message: 'some_value' }));
        expect(source.user_id).toBeUndefined();
      }
    );

    apiTest(
      'should write extracted value into a pre-existing parent object so it is readable downstream',
      async ({ esClient }) => {
        const indexName = 'streams-e2e-test-json-extract-nested-target';
        const pipelineId = 'streams-e2e-test-json-extract-nested-target-pipeline';

        // json_extract into a nested target, then a downstream step that reads it back
        // via the flexible accessor (mirrors the customer's json_extract -> math repro).
        const streamlangDSL = {
          steps: [
            {
              action: 'json_extract',
              field: 'attributes.payload',
              extractions: [
                {
                  selector: 'duration',
                  target_field: 'attributes.app.action.duration_nano',
                  type: 'long',
                },
              ],
            },
            {
              action: 'math',
              expression: 'attributes.app.action.duration_nano / 1000000000',
              to: 'attributes.app.action.duration',
            },
          ],
        } as unknown as StreamlangDSL;

        const { processors } = await transpile(streamlangDSL);

        try {
          await esClient.indices.create({
            index: indexName,
            mappings: { dynamic: 'true' },
          });

          // The child-stream pipeline uses the flexible field access pattern; the bug
          // only surfaces when reads/writes go through it.
          await esClient.ingest.putPipeline({
            id: pipelineId,
            field_access_pattern: 'flexible',
            processors,
          });

          // `attributes` already exists as a real object on the incoming document.
          const response = await esClient.bulk({
            refresh: true,
            pipeline: pipelineId,
            body: [
              { index: { _index: indexName } },
              {
                '@timestamp': '2026-06-29T15:30:00Z',
                attributes: { repro: 'yes', payload: '{"duration": 68319744}' },
              },
            ],
          });

          // No script_exception / NullPointerException from the downstream read.
          expect(response.errors).toBe(false);

          const searchResponse = await esClient.search({
            index: indexName,
            query: { match_all: {} },
            size: 1,
          });
          const source = searchResponse.hits.hits[0]._source as {
            attributes?: Record<string, unknown>;
          } & Record<string, unknown>;

          // The value lands inside the existing `attributes` object...
          expect(source.attributes?.['app.action.duration_nano']).toBe(68319744);
          // ...and not as a literal top-level dotted key.
          expect(source['attributes.app.action.duration_nano']).toBeUndefined();
        } finally {
          await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
          await esClient.ingest.deletePipeline({ id: pipelineId }, { ignore: [404] });
        }
      }
    );
  }
);
