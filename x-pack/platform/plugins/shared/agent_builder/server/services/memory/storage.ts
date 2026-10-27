/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { smlIndexName } from '@kbn/agent-builder-sml-plugin/server';

/** Short-term memories are stored in the Elastic AI index, next to the SML entries. */
export const memoryIndexName = smlIndexName;

const isAlreadyExists = (error: unknown): boolean =>
  error instanceof errors.ResponseError &&
  (error.body as { error?: { type?: string } } | undefined)?.error?.type ===
    'resource_already_exists_exception';

/**
 * Creates the Elastic AI index bare when the SML crawler has not created it yet, so the
 * Elasticsearch-managed template supplies its mappings. Memoized per Kibana process.
 */
export const createEnsureMemoryIndex = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): (() => Promise<void>) => {
  let ensured: Promise<void> | undefined;
  const ensure = async () => {
    if (await esClient.indices.exists({ index: memoryIndexName })) {
      return;
    }
    logger.info(`Creating '${memoryIndexName}' for short-term memory`);
    try {
      await esClient.indices.create({ index: memoryIndexName });
    } catch (error) {
      if (!isAlreadyExists(error)) {
        throw error;
      }
    }
  };
  return () => {
    ensured ??= ensure().catch((error) => {
      ensured = undefined;
      throw error;
    });
    return ensured;
  };
};
