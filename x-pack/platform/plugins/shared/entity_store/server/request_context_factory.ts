/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  EntityStoreApiRequestHandlerContext,
  EntityStoreCoreSetup,
  EntityStoreRequestHandlerContext,
} from './types';
import { AssetManagerClient } from './domain/asset_manager';
import { EntityMaintainersClient } from './domain/entity_maintainers';
import { FeatureFlags, isLegacySecurityAssetsMigrationEnabled } from './infra/feature_flags';
import { EngineDescriptorClient, EntityStoreGlobalStateClient } from './domain/saved_objects';
import { LogsExtractionClient } from './domain/logs_extraction';
import { HistorySnapshotClient } from './domain/history_snapshot';
import { CRUDClient } from './domain/crud';
import { EntityMetadataClient } from './domain/entity_metadata';
import { RelationshipsClient } from './domain/relationships';
import { ResolutionClient } from './domain/resolution';
import { ResolutionRulesClient } from './domain/resolution/rules';
import type { TelemetryReporter } from './telemetry/events';
import { createWorkflowTriggerEmitter } from './workflow/create_workflow_trigger_emitter';
import { prepareLatestIndexProvenanceMapping } from './domain/asset_manager/ensure_latest_index_mappings';

interface EntityStoreApiRequestHandlerContextDeps {
  coreSetup: EntityStoreCoreSetup;
  context: Omit<EntityStoreRequestHandlerContext, 'entityStore'>;
  logger: Logger;
  request: KibanaRequest;
  isServerless: boolean;
  analytics: TelemetryReporter;
}

export async function createRequestHandlerContext({
  logger,
  context,
  coreSetup,
  request,
  isServerless,
  analytics,
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  const core = await context.core;
  const [coreStart, startPlugins] = await coreSetup.getStartServices();
  const taskManagerStart = startPlugins.taskManager;

  const namespace = startPlugins.spaces.spacesService.getSpaceId(request);
  const emitEvent = createWorkflowTriggerEmitter({
    getWorkflowsClient: () => startPlugins.workflowsExtensions.getClient(request),
    logger,
    context: `namespace "${namespace}"`,
  });

  const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
    core.savedObjects.client,
    core.elasticsearch.client.asInternalUser,
    request
  );

  const engineDescriptorClient = new EngineDescriptorClient(
    core.savedObjects.client,
    namespace,
    logger
  );

  const globalStateClient = new EntityStoreGlobalStateClient(
    core.savedObjects.client,
    namespace,
    logger
  );

  const esClient = core.elasticsearch.client.asCurrentUser;
  const cpsClient = coreStart.elasticsearch.client.asScoped(request, {
    projectRouting: 'space',
  }).asCurrentUser;
  const provenanceEnabled = await prepareLatestIndexProvenanceMapping({
    esClient: core.elasticsearch.client.asInternalUser,
    featureFlags: coreStart.featureFlags,
    namespace,
    logger,
  });

  const crudClient = new CRUDClient({
    logger,
    esClient,
    namespace,
    emitWorkflowTriggerEvent: emitEvent,
  });
  const entityMetadataClient = new EntityMetadataClient({
    logger,
    esClient: core.elasticsearch.client.asInternalUser,
    namespace,
  });
  const logsExtractionClient = new LogsExtractionClient({
    logger,
    namespace,
    esClient: isServerless ? cpsClient : esClient,
    dataViewsService,
    engineDescriptorClient,
    globalStateClient,
    provenanceEnabled,
  });

  const historySnapshotClient = new HistorySnapshotClient({
    logger,
    esClient,
    namespace,
    globalStateClient,
  });

  return {
    core,
    logger,
    assetManagerClient: new AssetManagerClient({
      logger,
      esClient: core.elasticsearch.client.asCurrentUser,
      internalEsClient: core.elasticsearch.client.asInternalUser,
      taskManager: taskManagerStart,
      engineDescriptorClient,
      globalStateClient,
      namespace,
      isServerless,
      logsExtractionClient,
      security: startPlugins.security,
      analytics,
      savedObjectsClient: core.savedObjects.client,
      isLegacySecurityAssetsMigrationEnabled: () =>
        isLegacySecurityAssetsMigrationEnabled(coreStart.featureFlags),
    }),
    entityMaintainersClient: new EntityMaintainersClient({
      logger,
      taskManager: taskManagerStart,
      namespace,
      analytics,
      coreStart,
      licensing: startPlugins.licensing,
    }),
    crudClient,
    entityMetadataClient,
    relationshipsClient: new RelationshipsClient({
      logger,
      esClient: core.elasticsearch.client.asCurrentUser,
      namespace,
    }),
    resolutionClient: new ResolutionClient({
      logger,
      esClient: core.elasticsearch.client.asCurrentUser,
      namespace,
    }),
    entityResolutionRuleClient: new ResolutionRulesClient(
      core.savedObjects.client,
      namespace,
      logger
    ),
    featureFlags: new FeatureFlags(core.uiSettings.client),
    logsExtractionClient,
    historySnapshotClient,
    security: startPlugins.security,
    namespace,
    analytics,
  };
}
