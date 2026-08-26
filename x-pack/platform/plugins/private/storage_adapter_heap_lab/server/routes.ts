/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { SyntheticDocument } from './generator';
import { buildDocument, buildSchema, createRng } from './generator';

const OPT_OUT_AUTHZ = {
  authz: {
    enabled: false as const,
    reason: 'Temporary experiment plugin (DO NOT MERGE); not intended for production authz.',
  },
};

const generateBodySchema = schema.object({
  /** How many storage-adapter indices to create in this call. */
  numIndices: schema.number({ min: 1, max: 5000 }),
  /** How many top-level mapping fields each index/document should have. */
  numFields: schema.number({ min: 1, max: 5000 }),
  /** How many documents to insert into each index. */
  numDocs: schema.number({ min: 0, max: 1_000_000, defaultValue: 0 }),
  /** Index name prefix; final names are `${indexPrefix}-${runId}-${i}`. */
  indexPrefix: schema.string({ minLength: 1, maxLength: 64, defaultValue: 'heaplab' }),
  /** Bulk insert batch size. */
  batchSize: schema.number({ min: 1, max: 10_000, defaultValue: 500 }),
  /** Seed for the deterministic document generator. */
  seed: schema.number({ min: 0, max: 2 ** 31, defaultValue: 42 }),
  /**
   * When true, each index gets a distinct set of field names (salted per index),
   * so mappings are NOT deduplicated in cluster state — the "hundreds of distinct
   * types" worst case. When false (default), all indices share one mapping, which
   * ES deduplicates — the "per-space indices of one type" case.
   */
  uniqueFieldsPerIndex: schema.boolean({ defaultValue: false }),
});

const padIndex = (n: number): string => String(n).padStart(6, '0');

export const registerRoutes = (router: IRouter, logger: Logger): void => {
  router.post(
    {
      path: '/internal/storage_adapter_heap_lab/generate',
      security: OPT_OUT_AUTHZ,
      options: { access: 'internal' },
      validate: { body: generateBodySchema },
    },
    async (ctx, req, res) => {
      const { numIndices, numFields, numDocs, indexPrefix, batchSize, seed, uniqueFieldsPerIndex } =
        req.body;
      const runId = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
      const startedAt = Date.now();
      logger.info(
        `[heap-lab] generate called runId=${runId} numIndices=${numIndices} uniqueFields=${uniqueFieldsPerIndex}`
      );

      // Shared schema (deduplicated by ES) unless unique fields are requested, in
      // which case each index gets its own salted schema below.
      const sharedSchema = uniqueFieldsPerIndex ? undefined : buildSchema(numFields);
      const createdIndices: string[] = [];
      let totalDocs = 0;

      try {
        const core = await ctx.core;
        // Use the current user (a superuser locally) so we can create arbitrary index
        // names. `asInternalUser` is `kibana_system`, which only has privileges on the
        // specific patterns granted to it — a real operational cost for new
        // storage-adapter consumers, but orthogonal to the heap/shard cost we measure here.
        const esClient = core.elasticsearch.client.asCurrentUser;

        for (let i = 0; i < numIndices; i++) {
          const name = `${indexPrefix}-${runId}-${padIndex(i)}`;
          const fieldPrefix = uniqueFieldsPerIndex ? `${runId}_${padIndex(i)}_` : '';
          const schemaDefinition = sharedSchema ?? buildSchema(numFields, fieldPrefix);
          const storageSettings: IndexStorageSettings = { name, schema: schemaDefinition };
          const adapter = new StorageIndexAdapter<IndexStorageSettings, SyntheticDocument>(
            esClient,
            logger,
            storageSettings
          );
          const client = adapter.getClient();
          const rng = createRng(seed + i);

          if (numDocs > 0) {
            let inserted = 0;
            while (inserted < numDocs) {
              const batch = Math.min(batchSize, numDocs - inserted);
              const operations = Array.from({ length: batch }, () => ({
                index: { document: buildDocument(numFields, rng, fieldPrefix) },
              }));
              await client.bulk({ operations, refresh: false, throwOnFail: true });
              inserted += batch;
            }
            totalDocs += inserted;
          } else {
            // A single index() bootstraps the template + backing index + alias.
            await client.index({
              document: buildDocument(numFields, rng, fieldPrefix),
              refresh: false,
            });
          }

          createdIndices.push(name);
        }
      } catch (error) {
        const err = error as Error;
        logger.error(
          `[heap-lab] run ${runId} failed (${err?.constructor?.name}): ${err.stack || err.message}`
        );
        return res.customError({
          statusCode: 500,
          body: {
            message: `heap-lab generate failed after ${createdIndices.length} indices: ${err.message}`,
          },
        });
      }

      const elapsedMs = Date.now() - startedAt;
      logger.info(
        `[heap-lab] run ${runId}: created ${createdIndices.length} indices x ${numFields} fields, ${totalDocs} docs in ${elapsedMs}ms`
      );

      return res.ok({
        body: {
          runId,
          numIndices,
          numFields,
          numDocsPerIndex: numDocs,
          totalDocs,
          firstIndex: createdIndices[0],
          lastIndex: createdIndices[createdIndices.length - 1],
          elapsedMs,
        },
      });
    }
  );

  router.get(
    {
      path: '/internal/storage_adapter_heap_lab/stats',
      security: OPT_OUT_AUTHZ,
      options: { access: 'internal' },
      validate: false,
    },
    async (ctx, req, res) => {
      const core = await ctx.core;
      const esClient = core.elasticsearch.client.asInternalUser;

      const [nodesStats, clusterStats] = await Promise.all([
        esClient.nodes.stats({ metric: 'jvm' }),
        esClient.cluster.stats(),
      ]);

      const nodes = Object.entries(nodesStats.nodes ?? {}).map(([id, node]) => ({
        id,
        name: node.name,
        heapUsedBytes: node.jvm?.mem?.heap_used_in_bytes,
        heapUsedPercent: node.jvm?.mem?.heap_used_percent,
        heapMaxBytes: node.jvm?.mem?.heap_max_in_bytes,
      }));

      return res.ok({
        body: {
          timestamp: new Date().toISOString(),
          status: clusterStats.status,
          nodes,
          indicesCount: clusterStats.indices?.count,
          shardsTotal: clusterStats.indices?.shards?.total,
          totalFieldCount: clusterStats.indices?.mappings?.total_field_count,
          totalDeduplicatedFieldCount:
            clusterStats.indices?.mappings?.total_deduplicated_field_count,
          docsCount: clusterStats.indices?.docs?.count,
          storeSizeBytes: clusterStats.indices?.store?.size_in_bytes,
        },
      });
    }
  );
};
