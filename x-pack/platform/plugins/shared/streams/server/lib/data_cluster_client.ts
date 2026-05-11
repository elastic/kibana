/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Abstracts over local vs. remote ES cluster clients.
 *
 * - `isRemote === false`: queries go to the local Kibana-managed ES cluster.
 * - `isRemote === true`: queries go to the remote cluster configured via
 *   `xpack.streams.remoteEsCluster` in kibana.yml, using a fixed API key.
 */
export interface DataClusterClient {
  readonly esClient: ElasticsearchClient;
  readonly isRemote: boolean;
}

export const createLocalDataClusterClient = (esClient: ElasticsearchClient): DataClusterClient => ({
  esClient,
  isRemote: false,
});

export const createRemoteDataClusterClient = (
  esClient: ElasticsearchClient
): DataClusterClient => ({ esClient, isRemote: true });
