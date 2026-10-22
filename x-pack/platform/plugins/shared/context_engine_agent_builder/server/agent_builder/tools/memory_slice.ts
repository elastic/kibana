/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { MEMORY_SLICE_INDEX_SETTING } from '@kbn/context-engine-plugin/common/memory';
import { resolveMemorySlice } from '@kbn/context-engine-plugin/server/utils/resolve_memory_slice';
import type { CoreStart, ElasticsearchClient, IScopedClusterClient } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';

/** The caller's memory slice; a caller without a stable user id cannot own a memory. */
export const resolveMemoryUserSlice = async ({
  request,
  esClient,
  getCoreStart,
}: {
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  getCoreStart: () => Promise<CoreStart>;
}): Promise<string> => {
  const coreStart = await getCoreStart();
  const slice = await resolveMemorySlice({
    request,
    security: coreStart.security,
    esClient: esClient.asCurrentUser,
  });
  if (!slice) {
    throw new Error('Cannot store user memory without a user identity.');
  }
  return slice;
};

/** Creates the memory index with slices enabled, or rejects an existing index without them. */
export const ensureMemorySliceIndex = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string;
}): Promise<void> => {
  let response;
  try {
    response = await esClient.indices.getSettings({
      index,
      name: MEMORY_SLICE_INDEX_SETTING,
      flat_settings: true,
    });
  } catch (error) {
    if (!(error instanceof errors.ResponseError) || error.statusCode !== 404) {
      throw error;
    }
    await createMemorySliceIndex({ esClient, index });
    return;
  }
  if (String(response[index]?.settings?.[MEMORY_SLICE_INDEX_SETTING]) !== 'true') {
    throw new Error(`Memory index '${index}' must have ${MEMORY_SLICE_INDEX_SETTING} set to true.`);
  }
};

const isAlreadyExists = (error: unknown): boolean =>
  error instanceof errors.ResponseError &&
  (error.body as { error?: { type?: string } } | undefined)?.error?.type ===
    'resource_already_exists_exception';

const createMemorySliceIndex = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string;
}): Promise<void> => {
  try {
    await esClient.indices.create({ index, settings: { [MEMORY_SLICE_INDEX_SETTING]: true } });
  } catch (error) {
    if (!isAlreadyExists(error)) {
      throw error;
    }
  }
};
