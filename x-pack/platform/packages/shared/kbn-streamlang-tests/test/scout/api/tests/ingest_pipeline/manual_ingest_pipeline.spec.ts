/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { ManualIngestPipelineProcessor } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Manual Ingest Pipeline Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest(
      'should process basic manual ingest pipeline with set processor',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-manual-ingest-set';

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

        const { processors } = transpile(streamlangDSL);

        const docs = [
          {
            message: 'test message',
            existing_field: 'existing_value',
          },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0];
        expect(source?.status).toBe('processed');
        expect(source?.message).toBe('test message');
        expect(source?.existing_field).toBe('existing_value');
      }
    );

    apiTest(
      'should process manual ingest pipeline with multiple processors',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-manual-ingest-multiple';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'manual_ingest_pipeline',
              processors: [
                {
                  set: {
                    field: 'processor_type',
                    value: 'manual',
                  },
                },
                {
                  rename: {
                    field: 'original_name',
                    target_field: 'renamed_field',
                  },
                },
              ],
            } as ManualIngestPipelineProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          {
            original_name: 'test_value',
            message: 'test message',
          },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0];
        expect(source?.processor_type).toBe('manual');
        expect(source?.renamed_field).toBe('test_value');
        expect(source?.original_name).toBeUndefined(); // Should be renamed
        expect(source?.message).toBe('test message');
      }
    );

    apiTest(
      'should process manual ingest pipeline with conditional where clause',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-manual-ingest-conditional';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'manual_ingest_pipeline',
              processors: [
                {
                  set: {
                    field: 'status',
                    value: 'processed_with_condition',
                  },
                },
              ],
              where: { field: 'should_process', eq: true },
            } as ManualIngestPipelineProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

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
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocsOrdered(indexName);
        expect(ingestedDocs).toHaveLength(2);

        const processedDoc = ingestedDocs.find((doc) => doc.message === 'should be processed');
        const skippedDoc = ingestedDocs.find((doc) => doc.message === 'should NOT be processed');

        expect(processedDoc?.status).toBe('processed_with_condition');
        expect(skippedDoc?.status).toBeUndefined(); // Should not be processed
      }
    );

    apiTest('should handle manual ingest pipeline with tag', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-manual-ingest-tag';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'manual_ingest_pipeline',
            processors: [
              {
                set: {
                  field: 'tagged_field',
                  value: 'tagged_value',
                },
              },
            ],
            tag: 'test_manual_processor',
          } as ManualIngestPipelineProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          message: 'test message with tag',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.tagged_field).toBe('tagged_value');
      expect(source?.message).toBe('test message with tag');
    });

    apiTest(
      'should handle complex manual ingest pipeline with grok processor',
      async ({ testBed }) => {
        const indexName = 'stream-e2e-test-manual-ingest-grok';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'manual_ingest_pipeline',
              processors: [
                {
                  grok: {
                    field: 'message',
                    patterns: ['%{IP:client_ip} %{WORD:method} %{URIPATH:path}'],
                  },
                },
                {
                  set: {
                    field: 'parsed_by',
                    value: 'manual_grok',
                  },
                },
              ],
            } as ManualIngestPipelineProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          {
            message: '192.168.1.1 GET /api/users',
          },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0];
        expect(source?.client_ip).toBe('192.168.1.1');
        expect(source?.method).toBe('GET');
        expect(source?.path).toBe('/api/users');
        expect(source?.parsed_by).toBe('manual_grok');
        expect(source?.message).toBe('192.168.1.1 GET /api/users');
      }
    );
  }
);
