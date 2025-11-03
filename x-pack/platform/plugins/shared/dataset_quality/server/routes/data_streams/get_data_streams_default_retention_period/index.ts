/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export async function getDataStreamDefaultRetentionPeriod({
  esClient,
}: {
  esClient: ElasticsearchClient;
}) {
  let defaultRetention: string | undefined;
  try {
    const { persistent, defaults } = await esClient.cluster.getSettings({
      include_defaults: true,
    });
    const persistentDSRetention = persistent?.data_streams?.lifecycle?.retention?.failures_default;
    const defaultsDSRetention = defaults?.data_streams?.lifecycle?.retention?.failures_default;
    defaultRetention = persistentDSRetention ?? defaultsDSRetention;
  } catch (e) {
    if (e.meta?.statusCode === 403) {
      // if user doesn't have permissions to read cluster settings, we just return undefined
    } else {
      throw e;
    }
  }
  return defaultRetention;
}
