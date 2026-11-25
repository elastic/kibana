/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';

/**
 * Returns whether Elasticsearch supports ML cross-project search on datafeeds.
 * Uses the `_capabilities` API; returns false if the check fails or is unsupported.
 */
export async function getIsMlCpsEnabled(client: IScopedClusterClient): Promise<boolean> {
  try {
    const capabilities = await client.asInternalUser.capabilities({
      method: 'PUT',
      path: '/_ml/datafeeds/{datafeed_id}',
      capabilities: 'ml_cross_project_search',
    });
    return capabilities.supported === true;
  } catch {
    return false;
  }
}
