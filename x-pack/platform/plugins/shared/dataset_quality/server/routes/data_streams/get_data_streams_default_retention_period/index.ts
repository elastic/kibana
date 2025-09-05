/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

// In case this retention is not present in cluster.
// This is extracted from the docs that indicate that a thirty day (30d) retention is applied to failure store data:
// https://www.elastic.co/docs/manage-data/data-store/data-streams/failure-store#manage-failure-store-lifecycle
const DEFAULT_RETENTION_PERIOD = '30d';

export async function getDataStreamDefaultRetentionPeriod({
  esClient,
}: {
  esClient: ElasticsearchClient;
}) {
  const { persistent, defaults } = await esClient.cluster.getSettings({ include_defaults: true });
  const persistentDSRetention = persistent?.data_streams?.lifecycle?.retention?.failures_default;
  const defaultsDSRetention = defaults?.data_streams?.lifecycle?.retention?.failures_default;
  return persistentDSRetention ?? defaultsDSRetention ?? DEFAULT_RETENTION_PERIOD;
}
