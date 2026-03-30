/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IUiSettingsClient, ElasticsearchClient, Logger } from '@kbn/core/server';
import { LockManagerService } from '@kbn/lock-manager';
import { OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS } from '@kbn/management-settings-ids';
import type { StreamsPluginStartDependencies } from '../../types';
import { createStreamsStorageClient } from './storage/streams_storage_client';
import type { QueryClient } from './assets/query/query_client';
import { StreamsClient } from './client';
import type { AttachmentClient } from './attachments/attachment_client';
import type { FeatureClient } from './feature';

export class StreamsService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger,
    private readonly isDev: boolean
  ) {}

  async getClient({
    attachmentClient,
    queryClient,
    featureClient,
    esClient,
    esClientAsInternalUser,
    uiSettingsClient,
  }: {
    attachmentClient: AttachmentClient;
    queryClient: QueryClient;
    featureClient: FeatureClient;
    esClient: ElasticsearchClient;
    esClientAsInternalUser: ElasticsearchClient;
    uiSettingsClient: IUiSettingsClient;
  }): Promise<StreamsClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const logger = this.logger;

    const isServerless = coreStart.elasticsearch.getCapabilities().serverless;
    const isWiredStreamViewsEnabled = await uiSettingsClient.get<boolean>(
      OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS
    );

    return new StreamsClient({
      attachmentClient,
      queryClient,
      logger,
      featureClient,
      esClient,
      esClientAsInternalUser,
      lockManager: new LockManagerService(this.coreSetup, logger),
      storageClient: createStreamsStorageClient(esClientAsInternalUser, logger),
      isServerless,
      isWiredStreamViewsEnabled,
      isDev: this.isDev,
    });
  }
}
