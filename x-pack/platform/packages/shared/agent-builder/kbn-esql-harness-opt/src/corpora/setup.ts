/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { esqlFixtureDocumentRequests } from './documents';
import { esqlFixtureIndicesCreateRequests } from './indices';
import { agentBuilderFixtureDocuments, agentBuilderFixtureIndices } from './agent_builder_indices';
import { syntheticFixtureDocuments } from './synthetic_documents';

/**
 * Create every fixture index the anchor dataset's gold queries target and seed them with enough
 * documents that result equivalence can distinguish a right query from a wrong one.
 *
 * Idempotent: existing indices are left alone, documents are written with deterministic ids.
 */
export const setupFixtures = async ({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> => {
  const createRequests = [...esqlFixtureIndicesCreateRequests, ...agentBuilderFixtureIndices];
  log.info(`[harness-opt] creating ${createRequests.length} fixture indices`);

  for (const request of createRequests) {
    try {
      await esClient.indices.create(request);
    } catch (err) {
      const cause = err as { meta?: { body?: { error?: { type?: string } } } };
      if (cause?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        continue;
      }
      throw new Error(`[harness-opt] failed to create index "${request.index}"`, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  const documents = [
    ...esqlFixtureDocumentRequests,
    ...syntheticFixtureDocuments,
    ...agentBuilderFixtureDocuments,
  ];
  log.info(`[harness-opt] indexing ${documents.length} fixture documents`);

  const batchSize = 500;
  for (let offset = 0; offset < documents.length; offset += batchSize) {
    const batch = documents.slice(offset, offset + batchSize);
    const response = await esClient.bulk({
      // APM fixtures land in data streams, which only accept `create` ops; the rest carry a
      // deterministic id so re-running setup overwrites instead of duplicating.
      operations: batch.flatMap(({ index, id, document }) => [
        id ? { index: { _index: index, _id: id as string } } : { create: { _index: index } },
        document,
      ]),
    });
    if (response.errors) {
      const firstError = response.items.find((item) => item.index?.error ?? item.create?.error)
        ?.index?.error;
      throw new Error(`[harness-opt] fixture bulk index failed: ${JSON.stringify(firstError)}`);
    }
  }

  await esClient.indices.refresh({
    index: [...new Set([...createRequests, ...documents].map((request) => request.index))],
  });
};
