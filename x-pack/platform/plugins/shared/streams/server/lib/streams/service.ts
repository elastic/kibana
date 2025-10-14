/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { LockManagerService } from '@kbn/lock-manager';
import type { StreamsPluginStartDependencies } from '../../types';
import { createStreamsStorageClient } from './storage/streams_storage_client';
import type { AssetClient } from './assets/asset_client';
import type { QueryClient } from './assets/query/query_client';
import { StreamsClient } from './client';
import type { FeatureClient } from './feature/feature_client';

export class StreamsService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger,
    private readonly isDev: boolean
  ) {}

  async getClientWithRequest({
    request,
    assetClient,
    queryClient,
    featureClient: featureClient,
  }: {
    request: KibanaRequest;
    assetClient: AssetClient;
    queryClient: QueryClient;
    featureClient: FeatureClient;
  }): Promise<StreamsClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const logger = this.logger;

    const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
    const isServerless = coreStart.elasticsearch.getCapabilities().serverless;

    return new StreamsClient({
      assetClient,
      queryClient,
      featureClient,
      logger,
      scopedClusterClient,
      lockManager: new LockManagerService(this.coreSetup, logger),
      storageClient: createStreamsStorageClient(scopedClusterClient.asInternalUser, logger),
      request,
      isServerless,
      isDev: this.isDev,
    });
  }
}
