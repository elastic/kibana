/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Version } from '@kbn/upgrade-assistant-pkg-server';
import type { ReindexOperation } from '@kbn/upgrade-assistant-pkg-common';
import type {
  ReindexServiceScopedClient,
  ReindexServiceScopedClientArgs,
} from './src/lib/reindex_service_wrapper';

export interface RouteDependencies {
  router: IRouter;
  version: Version;
  getReindexService: () => Promise<ReindexServiceServerPluginStart>;
}

export interface ReindexServiceServerPluginStart {
  cleanupReindexOperations: (indexNames: string[]) => Promise<void>;
  getScopedClient: (scopedClientArgs: ReindexServiceScopedClientArgs) => ReindexServiceScopedClient;
}

export interface PostBatchResponse {
  enqueued: ReindexOperation[];
  errors: Array<{ indexName: string; message: string }>;
}

export interface GetBatchQueueResponse {
  queue: ReindexOperation[];
}
