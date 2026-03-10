/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
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

  async getClientWithRequest({
    request,
    attachmentClient,
    queryClient,
    featureClient,
    uiSettingsClient,
  }: {
    request: KibanaRequest;
    attachmentClient: AttachmentClient;
    queryClient: QueryClient;
    featureClient: FeatureClient;
    uiSettingsClient: IUiSettingsClient;
  }): Promise<StreamsClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const logger = this.logger;

    // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
    //   Review and choose one of the following options:
    //   A) Still unsure? Leave this comment as-is.
    //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
    //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
    //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
    const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request, { projectRouting: 'origin-only' });
    const isServerless = coreStart.elasticsearch.getCapabilities().serverless;
    const isWiredStreamViewsEnabled = await uiSettingsClient.get<boolean>(
      OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS
    );

    return new StreamsClient({
      attachmentClient,
      queryClient,
      logger,
      featureClient,
      scopedClusterClient,
      lockManager: new LockManagerService(this.coreSetup, logger),
      storageClient: createStreamsStorageClient(scopedClusterClient.asInternalUser, logger),
      request,
      isServerless,
      isWiredStreamViewsEnabled,
      isDev: this.isDev,
    });
  }
}
