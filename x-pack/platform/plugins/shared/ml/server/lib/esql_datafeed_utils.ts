/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';

export async function getIsMlEsqlDatafeedEnabled(client: IScopedClusterClient): Promise<boolean> {
  try {
    const capabilities = await client.asInternalUser.capabilities({
      method: 'PUT',
      path: '/_ml/datafeeds/{datafeed_id}',
      capabilities: 'ml_datafeed_esql_query',
    });
    return capabilities.supported === true;
  } catch {
    return false;
  }
}
