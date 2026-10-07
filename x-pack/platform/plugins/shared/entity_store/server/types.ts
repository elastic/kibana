/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type {
  CoreRequestHandlerContext,
  CustomRequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import type { IRouter } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type {
  LicensingApiRequestHandlerContext,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { AssetManagerClient } from './domain/asset_manager';
import type {
  EntityMaintainersClient,
  EntityMaintainerStatusEntry,
} from './domain/entity_maintainers';
import type { FeatureFlags } from './infra/feature_flags';
import type { LogsExtractionClient } from './domain/logs_extraction';
import type { HistorySnapshotClient } from './domain/history_snapshot';
import type { CRUDClient } from './domain/crud';
import type { EntityMetadataClient } from './domain/entity_metadata';
import type { RelationshipsClient } from './domain/relationships';
import type { ResolutionClient } from './domain/resolution';
import type { ResolutionRulesClient } from './domain/resolution/rules';
import type { RegisterEntityMaintainerConfig } from './tasks/entity_maintainers/types';
import type { TelemetryReporter } from './telemetry/events';
import type {
  EntityDefinitionsClient,
  RegistrableEntityDefinition,
  RegisterResult,
} from './domain/definitions/registry';

export interface EntityStoreSetupPlugins {
  taskManager: TaskManagerSetupContract;
  spaces: SpacesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface EntityStoreStartPlugins {
  taskManager: TaskManagerStartContract;
  spaces: SpacesPluginStart;
  dataViews: DataViewsPluginStart;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  licensing: LicensingPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

export interface EntityStoreApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  logger: Logger;
  assetManagerClient: AssetManagerClient;
  entityMaintainersClient: EntityMaintainersClient;
  crudClient: CRUDClient;
  entityMetadataClient: EntityMetadataClient;
  relationshipsClient: RelationshipsClient;
  resolutionClient: ResolutionClient;
  entityResolutionRuleClient: ResolutionRulesClient;
  featureFlags: FeatureFlags;
  logsExtractionClient: LogsExtractionClient;
  historySnapshotClient: HistorySnapshotClient;
  security: SecurityPluginStart;
  namespace: string;
  analytics: TelemetryReporter;
}

export type EntityStoreRequestHandlerContext = CustomRequestHandlerContext<{
  entityStore: EntityStoreApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
}>;

export type EntityStorePluginRouter = IRouter<EntityStoreRequestHandlerContext>;

export type RegisterEntityMaintainer = (config: RegisterEntityMaintainerConfig) => void;

export type EntityStoreCRUDClient = Omit<CRUDClient, 'createEntity'>;

export interface EntityStoreStartContract {
  createCRUDClient: (
    esClient: ElasticsearchClient,
    namespace: string,
    getWorkflowsClient?: () => Promise<{
      emitEvent: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
    }>
  ) => EntityStoreCRUDClient;
  createEntityMetadataClient: (
    esClient: ElasticsearchClient,
    namespace: string
  ) => EntityMetadataClient;
  createRelationshipsClient: (
    esClient: ElasticsearchClient,
    namespace: string
  ) => RelationshipsClient;
  createResolutionClient: (esClient: ElasticsearchClient, namespace: string) => ResolutionClient;
  createResolutionRulesClient: (
    savedObjectsClient: SavedObjectsClientContract,
    namespace: string
  ) => ResolutionRulesClient;
  getMaintainerStatus: (
    namespace: string,
    ids?: string[]
  ) => Promise<EntityMaintainerStatusEntry[]>;
  /**
   * Returns a client for reading entity definitions in the request's space.
   * Reading definitions requires no Kibana privilege today because all definitions are plugin
   * code. Authorisation will apply once definitions can be stored and managed outside plugin code;
   * the request parameter exists so that can be added without changing callers.
   */
  getEntityDefinitionsClient: (request: KibanaRequest) => EntityDefinitionsClient;
  /**
   * Returns a client for reading entity definitions in the given space, for background work
   * with no request.
   * Reading definitions requires no Kibana privilege today because all definitions are plugin
   * code. Authorisation will apply once definitions can be stored and managed outside plugin code;
   * request-scoped callers should use `getEntityDefinitionsClient` so that can be added without
   * changing them.
   */
  getEntityDefinitionsClientForSpace: (spaceId: string) => EntityDefinitionsClient;
}

export interface EntityStoreSetupContract {
  registerEntityMaintainer: RegisterEntityMaintainer;
  /**
   * Registers an entity definition. Registration is only possible during plugin setup; calls
   * after setup are logged and ignored. Type names must match `ENTITY_DEFINITION_TYPE_PATTERN`
   * (at most 64 characters) and be unique. The definition must carry
   * `managedBy: { kind: 'plugin', id: <your plugin id> }`. A rejected definition is logged and
   * skipped, and Kibana keeps starting.
   */
  registerEntityDefinition: (definition: RegistrableEntityDefinition) => RegisterResult;
}

export type EntityStoreCoreSetup = CoreSetup<EntityStoreStartPlugins, EntityStoreStartContract>;
