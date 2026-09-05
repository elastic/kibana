/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { registerRoutes } from './routes';
import type {
  EntityStoreCoreSetup,
  EntityStoreRequestHandlerContext,
  EntityStoreSetupPlugins,
  EntityStoreStartPlugins,
  EntityStoreStartContract,
  EntityStoreSetupContract,
} from './types';
import { createRequestHandlerContext } from './request_context_factory';
import { PLUGIN_ID } from '../common';
import { registerTasks } from './tasks/register_tasks';
import { scheduleLegacySecurityAssetsMigrationIfNeeded } from './tasks/legacy_security_assets_migration_task';
import {
  isEntityProvenanceEnabled,
  isLegacySecurityAssetsMigrationEnabled,
} from './infra/feature_flags';
import { scheduleEntityProvenanceMappingMigrationIfNeeded } from './tasks/entity_provenance_mapping_migration_task';
import { registerTriggers } from './workflow/triggers';
import { registerSteps } from './workflow/steps';
import { registerUiSettings } from './infra/feature_flags/register';
import {
  EngineDescriptorType,
  EntityStoreGlobalStateType,
  EntityStorePreferencesType,
  LegacyCcsLogExtractionStateType,
  LegacyRemoteLogExtractionStateType,
} from './domain/saved_objects';
import { EntityResolutionRuleType } from './domain/resolution/rules/saved_object';
import { registerEntityMaintainerTask } from './tasks/entity_maintainers';
import type { RegisterEntityMaintainerConfig } from './tasks/entity_maintainers/types';
import { getMaintainerStatus } from './domain/entity_maintainers';
import { CRUDClient } from './domain/crud';
import { EntityMetadataClient } from './domain/entity_metadata';
import { RelationshipsClient } from './domain/relationships';
import { ResolutionClient } from './domain/resolution';
import { registerTelemetry, createReportEvent } from './telemetry/events';
import { automatedResolutionMaintainerConfig } from './domain/resolution/rules/maintainers/automated_resolution';
import { createWorkflowTriggerEmitter } from './workflow/create_workflow_trigger_emitter';

export class EntityStorePlugin
  implements
    Plugin<
      EntityStoreSetupContract,
      EntityStoreStartContract,
      EntityStoreSetupPlugins,
      EntityStoreStartPlugins
    >
{
  private readonly logger: Logger;
  private readonly isServerless: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: EntityStoreCoreSetup,
    plugins: EntityStoreSetupPlugins
  ): EntityStoreSetupContract {
    plugins.taskManager.registerCanEncryptedSavedObjects(plugins.encryptedSavedObjects.canEncrypt);

    this.logger.debug('Registering telemetry events');
    registerTelemetry(core.analytics);

    const router = core.http.createRouter<EntityStoreRequestHandlerContext>();
    core.http.registerRouteHandlerContext<EntityStoreRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      (context, request) =>
        createRequestHandlerContext({
          context,
          coreSetup: core,
          logger: this.logger,
          request,
          isServerless: this.isServerless,
          analytics: createReportEvent(core.analytics),
        })
    );

    registerTasks(plugins.taskManager, this.logger, core, this.isServerless);
    registerTriggers(plugins.workflowsExtensions);
    registerSteps(plugins.workflowsExtensions, core);
    this.logger.debug('Registering routes');
    registerRoutes(router);

    this.logger.debug('Registering ui settings');
    registerUiSettings(core.uiSettings);

    this.logger.debug('Registering saved objects types');
    core.savedObjects.registerType(EngineDescriptorType);
    core.savedObjects.registerType(EntityStoreGlobalStateType);
    core.savedObjects.registerType(EntityStorePreferencesType);
    core.savedObjects.registerType(LegacyRemoteLogExtractionStateType);
    core.savedObjects.registerType(LegacyCcsLogExtractionStateType);
    core.savedObjects.registerType(EntityResolutionRuleType);

    registerEntityMaintainerTask({
      taskManager: plugins.taskManager,
      logger: this.logger,
      config: automatedResolutionMaintainerConfig,
      core,
      analytics: createReportEvent(core.analytics),
    });

    return {
      registerEntityMaintainer: (config: RegisterEntityMaintainerConfig) =>
        registerEntityMaintainerTask({
          taskManager: plugins.taskManager,
          logger: this.logger,
          config,
          core,
          analytics: createReportEvent(core.analytics),
        }),
    };
  }

  public start(core: CoreStart, plugins: EntityStoreStartPlugins): EntityStoreStartContract {
    this.logger.info('Initializing plugin');

    plugins.taskManager.registerEncryptedSavedObjectsClient(
      plugins.encryptedSavedObjects.getClient({
        includedHiddenTypes: ['task', 'api_key_to_invalidate'],
      })
    );

    plugins.taskManager.registerApiKeyInvalidateFn(
      plugins.security?.authc.apiKeys.invalidateAsInternalUser
    );

    // Upgrade path: migrate Security-scoped `.entities.v2.*.security_*` assets for spaces
    // that already have the store enabled, without waiting for a human to re-run install.
    // Gated by FF so the cutover can be verified on a large env before customer traffic.
    void scheduleLegacySecurityAssetsMigrationIfNeeded({
      coreStart: core,
      taskManager: plugins.taskManager,
      logger: this.logger,
      isMigrationEnabled: () => isLegacySecurityAssetsMigrationEnabled(core.featureFlags),
    });
    void scheduleEntityProvenanceMappingMigrationIfNeeded({
      coreStart: core,
      taskManager: plugins.taskManager,
      logger: this.logger,
      isMigrationEnabled: () => isEntityProvenanceEnabled(core.featureFlags),
    });

    const logger = this.logger;
    return {
      createCRUDClient: (esClient, namespace, getWorkflowsClient) => {
        const emitWorkflowTriggerEvent = getWorkflowsClient
          ? createWorkflowTriggerEmitter({
              getWorkflowsClient,
              logger,
              context: `namespace "${namespace}"`,
            })
          : undefined;
        return new CRUDClient({ logger, esClient, namespace, emitWorkflowTriggerEvent });
      },
      createEntityMetadataClient: (esClient, namespace) =>
        new EntityMetadataClient({ logger, esClient, namespace }),
      createRelationshipsClient: (esClient, namespace) =>
        new RelationshipsClient({ logger, esClient, namespace }),
      createResolutionClient: (esClient, namespace) =>
        new ResolutionClient({ logger, esClient, namespace }),
      getMaintainerStatus: (namespace, ids) =>
        getMaintainerStatus({ taskManager: plugins.taskManager, namespace, logger, ids }),
    };
  }

  public stop() {
    this.logger.info('Stopping plugin');
  }
}
