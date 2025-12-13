/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import { createFakeRequestBoundToDefaultSpace } from '../helpers/fake_request_factory';
import type { StoredSignificantEventLink } from './significant_events_client';
import { SignificantEventsClient } from './significant_events_client';
import type { AssetStorageSettings } from '../assets/storage_settings';
import { assetStorageSettings } from '../assets/storage_settings';

export class SignificantEventsService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<SignificantEventsClient> {
    const [coreStart, pluginStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<AssetStorageSettings, StoredSignificantEventLink>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('significant-events'),
      assetStorageSettings
    );

    const soClient = coreStart.savedObjects.getScopedClient(request);
    const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);
    const isSignificantEventsEnabled =
      (await uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS)) ?? false;

    const fakeRequest = createFakeRequestBoundToDefaultSpace(request);
    const rulesClient = await pluginStart.alerting.getRulesClientWithRequest(fakeRequest);

    return new SignificantEventsClient(
      {
        storageClient: adapter.getClient(),
        soClient,
        rulesClient,
        logger: this.logger,
      },
      isSignificantEventsEnabled
    );
  }
}
