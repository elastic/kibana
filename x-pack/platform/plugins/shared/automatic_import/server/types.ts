/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type {
  AuthenticatedUser,
  CoreRequestHandlerContext,
  CoreSetup,
  CustomRequestHandlerContext,
  ElasticsearchClient,
  IRouter,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  LicensingApiRequestHandlerContext,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { FieldsMetadataServerStart } from '@kbn/fields-metadata-plugin/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { AutomaticImportService } from './services';

export const PLUGIN_ID = 'automaticImport' as const;

/** The plugin setup interface */
export interface AutomaticImportPluginSetup {
  actions: ActionsPluginSetup;
  spaces?: SpacesPluginSetup;
  /**
   * Serverless / product-tier integration: when called with `false`, Automatic Import APIs
   * report the feature as unavailable (in addition to license checks).
   */
  setIsAvailable: (isAvailable: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AutomaticImportPluginStart {}

export interface AutomaticImportPluginSetupDependencies {
  actions: ActionsPluginSetup;
  spaces?: SpacesPluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
}
export interface AutomaticImportPluginStartDependencies {
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  inference: InferenceServerStart;
  licensing: LicensingPluginStart;
  security: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
  fieldsMetadata: FieldsMetadataServerStart;
}

export interface AutomaticImportPluginApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  actions: ActionsPluginStart;
  logger: Logger;
  getServerBasePath: () => string;
  getCurrentUser: () => Promise<AuthenticatedUser>;
  inference: InferenceServerStart;
  savedObjectsClient: SavedObjectsClientContract;
  getSpaceId: () => string;
  automaticImportService: AutomaticImportService;
  esClient: ElasticsearchClient;
  internalEsClient: ElasticsearchClient;
  reportTelemetryEvent: <TEventType extends string>(
    eventType: TEventType,
    eventData: Record<string, unknown>
  ) => void;
  fieldsMetadataClient: IFieldsMetadataClient;
  isAvailable: () => boolean;
}

/**
 * @internal
 */
export type AutomaticImportPluginRequestHandlerContext = CustomRequestHandlerContext<{
  automaticImport: AutomaticImportPluginApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
}>;

export type AutomaticImportPluginRouter = IRouter<AutomaticImportPluginRequestHandlerContext>;

export type AutomaticImportPluginCoreSetupDependencies = CoreSetup<
  AutomaticImportPluginStartDependencies,
  AutomaticImportPluginStart
>;
