/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { ManualIngestPipelineProcessor } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - Manual Ingest Pipeline Processor (Not Supported)',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest(
      'should handle manual_ingest_pipeline by showing warning message',
      async ({ esql, testBed }) => {
        const indexName = 'stream-e2e-test-esql-manual-not-supported';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'manual_ingest_pipeline',
              processors: [
                {
                  set: {
                    field: 'status',
                    value: 'processed',
                  },
                },
              ],
            } as ManualIngestPipelineProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        // Verify that the ES|QL query contains a warning about manual_ingest_pipeline not being supported
        expect(query).toContain('WARNING: Manual ingest pipeline not supported in ES|QL');

        // Test that the generated query is valid ES|QL syntax
        const docs = [
          {
            message: 'test message',
            existing_field: 'existing_value',
          },
        ];

        // Create a simple test index with data for ES|QL execution
        await testBed.ingest(indexName, docs);

        // Execute the ES|QL query - it should run without syntax errors
        const result = await esql.queryOnIndex(indexName, query);

        // Should return the documents (the warning is just informational)
        expect(result.documents.length).toBeGreaterThan(0);

        // The original fields should be preserved since manual_ingest_pipeline is not processed
        expect(result.documents[0]?.message).toBe('test message');
        expect(result.documents[0]?.existing_field).toBe('existing_value');

        // The manual processor should NOT have been applied (no 'status' field)
        expect(result.documents[0]?.status).toBeUndefined();
      }
    );

    apiTest(
      'should handle manual_ingest_pipeline with where condition (condition ignored)',
      async ({ esql, testBed }) => {
        const indexName = 'stream-e2e-test-esql-manual-conditional';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'manual_ingest_pipeline',
              processors: [
                {
                  set: {
                    field: 'conditional_field',
                    value: 'conditional_value',
                  },
                },
              ],
              where: { field: 'should_process', eq: true },
            } as ManualIngestPipelineProcessor,
          ],
        };

        const { query } = transpile(streamlangDSL);

        expect(query).toContain('WARNING: Manual ingest pipeline not supported in ES|QL');

        const docs = [
          {
            message: 'should be processed',
            should_process: true,
          },
          {
            message: 'should NOT be processed',
            should_process: false,
          },
        ];

        await testBed.ingest(indexName, docs);
        const result = await esql.queryOnIndex(indexName, query);

        // Both documents should be returned since the manual processor (and its condition) is ignored
        expect(result.documents).toHaveLength(2);

        // Neither document should have the conditional field applied
        result.documents.forEach((doc) => {
          expect(doc?.conditional_field).toBeUndefined();
        });
      }
    );

    apiTest(
      'should generate valid ES|QL when mixed with supported processors',
      async ({ esql, testBed }) => {
        const indexName = 'stream-e2e-test-esql-mixed-processors';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'supported_field',
              value: 'supported_value',
            },
            {
              action: 'manual_ingest_pipeline',
              processors: [
                {
                  set: {
                    field: 'unsupported_field',
                    value: 'unsupported_value',
                  },
                },
              ],
            } as ManualIngestPipelineProcessor,
            {
              action: 'rename',
              from: 'old_field',
              to: 'new_field',
              override: true,
            },
          ],
        };

        const { query } = transpile(streamlangDSL);

        // Should contain the warning for manual processor
        expect(query).toContain('WARNING: Manual ingest pipeline not supported in ES|QL');

        // Should also contain supported processors
        expect(query).toContain('EVAL'); // For set processor

        const docs = [
          {
            message: 'test message',
            old_field: 'to_be_renamed',
            new_field: '',
          },
        ];

        await testBed.ingest(indexName, docs);
        const result = await esql.queryOnIndex(indexName, query);

        expect(result.documents.length).toBeGreaterThan(0);

        const doc = result.documents[0];

        // Supported processors should work
        expect(doc?.supported_field).toBe('supported_value');
        expect(doc?.new_field).toBe('to_be_renamed');
        expect(doc?.old_field).toBeUndefined(); // Should be renamed

        // Manual processor should be ignored
        expect(doc?.unsupported_field).toBeUndefined();
      }
    );
  }
);
