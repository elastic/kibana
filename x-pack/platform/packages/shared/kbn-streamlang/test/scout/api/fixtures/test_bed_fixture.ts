/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorCause, IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { apiTest } from '@kbn/scout';

export interface TestBedFixture {
  testBed: {
    /**
     * Ingests documents into an index with an optional ingest pipeline.
     * @param indexName The name of the index.
     * @param documents An array of documents to ingest.
     * @param processors An optional array of ingest processors to create a pipeline.
     * @returns An object containing the number of ingested documents and an array of errors.
     */
    ingest: (
      indexName: string,
      documents: Array<Record<string, any>>,
      processors?: IngestProcessorContainer[]
    ) => Promise<{ errors: ErrorCause[]; docs: number }>;
    /**
     * Gets all documents from an index.
     * @param indexName The name of the index.
     * @returns An array of documents.
     */
    getDocs: (indexName: string) => Promise<Array<Record<string, any>>>;
    /**
     * Deletes an index.
     * @param indexName The name of the index to delete.
     */
    clean: (indexName: string) => Promise<void>;
  };
}

export const testBedFixture = apiTest.extend<TestBedFixture>({
  testBed: [
    async ({ esClient }, use) => {
      const createdPipelines = new Set<string>();
      const createdIndexes = new Set<string>();

      const createPipeline = async (processors: IngestProcessorContainer[]) => {
        const pipelineId = `test-bed-pipeline-${Date.now()}`;
        await esClient.ingest.putPipeline({
          id: pipelineId,
          processors,
        });
        createdPipelines.add(pipelineId);
        return pipelineId;
      };

      const createIndex = async (indexName: string) => {
        if (createdIndexes.has(indexName)) return;
        await esClient.indices.create({
          index: indexName,
          mappings: {
            dynamic: 'true',
            dynamic_templates: [
              {
                all_strings_as_is: {
                  match: '*',
                  match_mapping_type: 'string', // Do not ingest keywords for string fields
                  mapping: {
                    type: 'text',
                    index: false,
                  },
                },
              },
            ],
          },
        });
        createdIndexes.add(indexName);
      };

      const ingest = async (
        indexName: string,
        documents: Array<Record<string, any>>,
        processors?: IngestProcessorContainer[]
      ) => {
        let pipelineId: string | undefined;
        if (processors && processors.length > 0) {
          pipelineId = await createPipeline(processors);
        }

        await createIndex(indexName);

        if (!documents || documents.length === 0) {
          return { docs: 0, errors: [] };
        }

        const body = documents.flatMap((doc) => [{ index: { _index: indexName } }, doc]);

        const bulkRequest: Record<string, any> = {
          refresh: true,
          body,
        };
        if (pipelineId) {
          bulkRequest.pipeline = pipelineId;
        }

        const esResp = await esClient.bulk(bulkRequest);

        if (esResp.errors) {
          const errorsCauses = esResp.items
            .map((item) => (item.index || item.create || item.update || item.delete)?.error)
            .filter((error): error is ErrorCause => error !== undefined);

          // eslint-disable-next-line no-console
          console.error('Bulk ingestion errors:', JSON.stringify(errorsCauses, null, 2));
          return { docs: 0, errors: errorsCauses };
        }

        return { docs: documents.length, errors: [] };
      };

      const getDocs = async (indexName: string) => {
        const response = await esClient.search({
          index: indexName,
          query: { match_all: {} },
          size: 1000,
        });

        return response.hits.hits.map((hit) => hit._source as Record<string, any>);
      };

      const clean = async (indexName: string) => {
        if (await esClient.indices.exists({ index: indexName })) {
          await esClient.indices.delete({
            index: indexName,
            ignore_unavailable: true,
          });
          createdIndexes.delete(indexName);
        }
      };

      // Test execution phase
      await use({ ingest, getDocs, clean });

      // Cleanup phase
      await Promise.all([...createdIndexes].map((indexName) => clean(indexName)));
      await Promise.all(
        [...createdPipelines].map((pipelineId) =>
          esClient.ingest.deletePipeline({ id: pipelineId })
        )
      );
    },
    { scope: 'test' },
  ],
});
