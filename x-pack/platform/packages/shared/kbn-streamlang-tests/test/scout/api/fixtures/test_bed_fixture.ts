/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ErrorCause, IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { apiTest } from '@kbn/scout';

export interface IngestOptions {
  /**
   * Controls dynamic field mapping on the target index.
   * - `true` (default): auto-map all ingested fields
   * - `false`: disable auto-mapping so fields are stored in `_source` only
   */
  dynamic?: boolean;
}

export interface TestBedFixture {
  testBed: {
    /**
     * Ingests documents into an index with an optional ingest pipeline.
     * An internal `order_id` field is automatically added to each document to allow for
     * deterministic sorting. It is stripped from all results returned by this fixture.
     * @param indexName The name of the index.
     * @param documents An array of documents to ingest.
     * @param processors An optional array of ingest processors to create a pipeline.
     * @param options Optional ingest settings (e.g. `dynamic: false` to disable auto-mapping).
     * @returns An object containing the number of ingested documents and an array of errors.
     */
    ingest: (
      indexName: string,
      documents: Array<Record<string, unknown>>,
      processors?: IngestProcessorContainer[],
      options?: IngestOptions
    ) => Promise<{ errors: ErrorCause[]; docs: number }>;
    /**
     * Gets all documents from an index in their natural, non-deterministic order.
     * @param indexName The name of the index.
     * @returns An array of documents.
     */
    getDocs: (indexName: string) => Promise<Array<Record<string, unknown>>>;
    /**
     * Gets all documents from an index, sorted deterministically by the internal `order_id`.
     * @param indexName The name of the index.
     * @returns A sorted array of documents.
     */
    getDocsOrdered: (indexName: string) => Promise<Array<Record<string, unknown>>>;
    /**
     * Serializes documents with each nested field represented in dot notation.
     * Helpful to compare documents returned by ES|QL queries. Returns in non-deterministic order.
     * @param indexName
     */
    getFlattenedDocs: (indexName: string) => Promise<Array<Record<string, unknown>>>;
    /**
     * Serializes documents with each nested field represented in dot notation, sorted deterministically by `order_id`.
     * @param indexName
     */
    getFlattenedDocsOrdered: (indexName: string) => Promise<Array<Record<string, unknown>>>;
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

      const ingest = async (
        indexName: string,
        documents: Array<Record<string, unknown>>,
        processors?: IngestProcessorContainer[],
        options?: IngestOptions
      ) => {
        let pipelineId: string | undefined;
        if (processors && processors.length > 0) {
          pipelineId = await createPipeline(processors);
        }

        await ensureIndexCreated(indexName, esClient, options?.dynamic);
        createdIndexes.add(indexName);

        if (!documents || documents.length === 0) {
          return { docs: 0, errors: [] };
        }

        const body = documents
          .map((doc, idx) => ({ ...doc, order_id: idx })) // Add internal field for deterministic sorting
          .flatMap((doc) => [{ index: { _index: indexName } }, doc]);

        const bulkRequest: Record<string, unknown> = {
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

        return response.hits.hits.map((hit) => {
          const { order_id: _, ...rest } = hit._source as Record<string, unknown>;
          return rest;
        });
      };

      const getDocsRaw = async (indexName: string) => {
        const response = await esClient.search({
          index: indexName,
          query: { match_all: {} },
          size: 1000,
        });
        return response.hits.hits.map((hit) => hit._source as Record<string, unknown>);
      };

      const getDocsOrdered = async (indexName: string) => {
        const docs = await getDocsRaw(indexName);
        const sorted = docs.sort((a, b) => (a.order_id as number) - (b.order_id as number));
        return sorted.map(({ order_id: _, ...rest }) => rest);
      };

      const flattenDoc = (doc: Record<string, unknown>): Record<string, unknown> => {
        const result: Record<string, unknown> = {};

        const flatten = (obj: Record<string, unknown>, prefix = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const prefixedKey = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              flatten(value as Record<string, unknown>, prefixedKey);
            } else {
              result[prefixedKey] = value;
            }
          }
        };

        flatten(doc);
        return result;
      };

      const getFlattenedDocs = async (indexName: string) => {
        const docs = await getDocs(indexName);
        return docs.map(flattenDoc);
      };

      const getFlattenedDocsOrdered = async (indexName: string) => {
        const docs = await getDocsRaw(indexName);
        const sorted = docs.sort((a, b) => (a.order_id as number) - (b.order_id as number));
        return sorted.map(({ order_id: _, ...rest }) => flattenDoc(rest));
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
      await use({
        ingest,
        getDocs,
        getDocsOrdered,
        getFlattenedDocs,
        getFlattenedDocsOrdered,
        clean,
      });

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

async function ensureIndexCreated(indexName: string, esClient: Client, dynamic?: boolean) {
  if (await esClient.indices.exists({ index: indexName })) {
    return;
  }

  // When dynamic is explicitly false, disable auto-mapping so fields are stored in _source only.
  // This is required to genuinely exercise SET UNMAPPED_FIELDS=LOAD/NULLIFY in ES|QL queries.
  // Default behaviour keeps auto-mapping enabled ('true') for backwards compatibility.
  //
  // `fake_test_prop` is always present (the testBed adds it to every document). We explicitly map it
  // so the index is never *completely* unmapped — a fully-unmapped index triggers ES|QL's
  // <no-fields> sentinel, which currently causes an optimizer crash with unmapped_fields="load"
  // Having at least one mapped field avoids that code path while leaving all other fields unmapped for
  // LOAD to resolve from _source.
  return esClient.indices.create({
    index: indexName,
    mappings: {
      dynamic: dynamic === false ? false : 'true',
      ...(dynamic === false && {
        properties: {
          fake_test_prop: { type: 'long' },
        },
      }),
    },
  });
}
