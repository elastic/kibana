/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  IScopedClusterClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { StreamsPluginStartDependencies } from '../../../types';
import { AssetClient, StoredAssetLink } from './asset_client';
import { AssetStorageSettings, assetStorageSettings } from './storage_settings';

export function getAssetClientWithRequest({
  scopedClusterClient,
  savedObjectsClient,
  logger,
  rulesClient,
}: {
  scopedClusterClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  rulesClient: RulesClient | null;
}) {
  const adapter = new StorageIndexAdapter<AssetStorageSettings, StoredAssetLink>(
    scopedClusterClient.asInternalUser,
    logger.get('assets'),
    assetStorageSettings
  );

  return new AssetClient({
    storageClient: adapter.getClient(),
    soClient: savedObjectsClient,
    rulesClient,
  });
}

export class AssetService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<AssetClient> {
    const [coreStart, pluginsStart] = await this.coreSetup.getStartServices();

    return getAssetClientWithRequest({
      logger: this.logger,
      savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
      scopedClusterClient: coreStart.elasticsearch.client.asScoped(request),
      rulesClient: await pluginsStart.alerting.getRulesClientWithRequest(request),
    });
  }
}
