/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { EntityStoreCoreSetup } from '../types';
import { AssetManagerClient } from '../domain/asset_manager';
import { LogsExtractionClient } from '../domain/logs_extraction';
import { EngineDescriptorClient, EntityStoreGlobalStateClient } from '../domain/saved_objects';
import type { TelemetryReporter } from '../telemetry/events';
import { isLegacySecurityAssetsMigrationEnabled } from '../infra/feature_flags';

export interface LogsExtractionClientFactoryResult {
  logsExtractionClient: LogsExtractionClient;
}

export interface AssetManagerClientFactoryResult {
  assetManagerClient: AssetManagerClient;
  esClient: ElasticsearchClient;
}

export async function createLogsExtractionClient({
  core,
  fakeRequest,
  logger,
  namespace,
  isServerless,
}: {
  core: EntityStoreCoreSetup;
  logger: Logger;
  namespace: string;
  fakeRequest: KibanaRequest;
  isServerless: boolean;
}): Promise<LogsExtractionClientFactoryResult> {
  const [coreStart, pluginsStart] = await core.getStartServices();

  const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
  const internalUserClient = coreStart.elasticsearch.client.asInternalUser;

  const dataViewsService = await pluginsStart.dataViews.dataViewsServiceFactory(
    soClient,
    internalUserClient,
    fakeRequest
  );

  const esClient = coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
  const cpsClient = coreStart.elasticsearch.client.asScoped(fakeRequest, {
    projectRouting: 'space',
  }).asCurrentUser;

  const logsExtractionClient = new LogsExtractionClient({
    logger,
    namespace,
    esClient: isServerless ? cpsClient : esClient,
    dataViewsService,
    engineDescriptorClient: new EngineDescriptorClient(soClient, namespace, logger),
    globalStateClient: new EntityStoreGlobalStateClient(soClient, namespace, logger),
  });

  return { logsExtractionClient };
}

export async function createAssetManagerClient({
  core,
  fakeRequest,
  logger,
  namespace,
  analytics,
  isServerless = false,
}: {
  core: EntityStoreCoreSetup;
  logger: Logger;
  namespace: string;
  fakeRequest: KibanaRequest;
  analytics: TelemetryReporter;
  isServerless?: boolean;
}): Promise<AssetManagerClientFactoryResult> {
  const [coreStart, pluginsStart] = await core.getStartServices();

  const esClient = coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
  const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
  const engineDescriptorClient = new EngineDescriptorClient(soClient, namespace, logger);
  const globalStateClient = new EntityStoreGlobalStateClient(soClient, namespace, logger);

  const { logsExtractionClient } = await createLogsExtractionClient({
    core,
    fakeRequest,
    logger,
    namespace,
    isServerless,
  });

  return {
    esClient,
    assetManagerClient: new AssetManagerClient({
      logger,
      esClient,
      internalEsClient: coreStart.elasticsearch.client.asInternalUser,
      taskManager: pluginsStart.taskManager,
      engineDescriptorClient,
      globalStateClient,
      namespace,
      isServerless,
      logsExtractionClient,
      security: pluginsStart.security,
      analytics,
      savedObjectsClient: soClient,
      isLegacySecurityAssetsMigrationEnabled: () =>
        isLegacySecurityAssetsMigrationEnabled(coreStart.featureFlags),
    }),
  };
}
