/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * Checks whether there's at least one index the current user can search, so the Search
 * Profiler UI knows whether to allow a profiled search.
 *
 * Local indices are checked first, since that's the common case and doesn't depend on
 * cross-cluster search being configured. Remote indices are only checked as a fallback,
 * and a failure there (e.g. an unreachable or misconfigured remote cluster returning an
 * error for a `*:*` pattern) is swallowed rather than surfaced, so a broken remote cluster
 * doesn't disable the profiler for local indices.
 */
export async function hasIndices(client: ElasticsearchClient, log: Logger): Promise<boolean> {
  const hasLocalIndices = await client.indices.exists({ index: '*' });
  if (hasLocalIndices) {
    return true;
  }

  try {
    return await client.indices.exists({ index: '*:*' });
  } catch (e) {
    log.debug(`Search Profiler remote index check failed, ignoring: ${e.message}`);
    return false;
  }
}
