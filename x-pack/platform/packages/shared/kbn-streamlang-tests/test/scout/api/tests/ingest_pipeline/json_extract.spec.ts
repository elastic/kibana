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

        const { processors } = transpile(streamlangDSL);

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

        const { processors } = transpile(streamlangDSL);

        const docs = [{ message: 'some_value' }];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0] as Record<string, unknown>;
        expect(source).toStrictEqual(expect.objectContaining({ message: 'some_value' }));
        expect(source.user_id).toBeUndefined();
      }
    );
  }
);
