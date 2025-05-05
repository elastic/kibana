/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { IStorageClient, StorageIndexAdapter, StorageSettings, types } from '@kbn/storage-adapter';
import { Streams } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from '../../types';
import { StreamsClient } from './client';
import { AssetClient } from './assets/asset_client';

export const streamsStorageSettings = {
  name: '.kibana_streams',
  schema: {
    properties: {
      name: types.keyword(),
      description: types.text(),
      ingest: types.object({ enabled: false }),
      group: types.object({ enabled: false }),
    },
  },
} satisfies StorageSettings;

export type StreamsStorageSettings = typeof streamsStorageSettings;
export type StreamsStorageClient = IStorageClient<StreamsStorageSettings, Streams.all.Definition>;

export class StreamsService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger,
    private readonly isDev: boolean
  ) {}

  async getClientWithRequest({
    request,
    assetClient,
  }: {
    request: KibanaRequest;
    assetClient: AssetClient;
  }): Promise<StreamsClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const logger = this.logger;

    const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

    const isServerless = coreStart.elasticsearch.getCapabilities().serverless;

    const storageAdapter = new StorageIndexAdapter<
      StreamsStorageSettings,
      Streams.all.Definition & { _id: string }
    >(scopedClusterClient.asInternalUser, logger, streamsStorageSettings);

    return new StreamsClient({
      assetClient,
      logger,
      scopedClusterClient,
      storageClient: storageAdapter.getClient(),
      request,
      isServerless,
      isDev: this.isDev,
    });
  }
}
