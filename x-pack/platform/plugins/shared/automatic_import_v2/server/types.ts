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
import type { AutomaticImportService } from './services';

export const PLUGIN_ID = 'automaticImportV2' as const;

/** The plugin setup interface */
export interface AutomaticImportV2PluginSetup {
  actions: ActionsPluginSetup;
  spaces?: SpacesPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AutomaticImportV2PluginStart {}

export interface AutomaticImportV2PluginSetupDependencies {
  actions: ActionsPluginSetup;
  spaces?: SpacesPluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
}
export interface AutomaticImportV2PluginStartDependencies {
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  inference: InferenceServerStart;
  licensing: LicensingPluginStart;
  security: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
}

export interface AutomaticImportV2PluginApiRequestHandlerContext {
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
}

/**
 * @internal
 */
export type AutomaticImportV2PluginRequestHandlerContext = CustomRequestHandlerContext<{
  automaticImportv2: AutomaticImportV2PluginApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
}>;

export type AutomaticImportV2PluginRouter = IRouter<AutomaticImportV2PluginRequestHandlerContext>;

export type AutomaticImportV2PluginCoreSetupDependencies = CoreSetup<
  AutomaticImportV2PluginStartDependencies,
  AutomaticImportV2PluginStart
>;
