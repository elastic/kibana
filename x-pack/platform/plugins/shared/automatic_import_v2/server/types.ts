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
  IRouter,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  LicensingApiRequestHandlerContext,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { CheckPrivileges, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';

export const PLUGIN_ID = 'automaticImportV2' as const;

/** The plugin setup interface */
export interface AutomaticImportPluginSetup {
  actions: ActionsPluginSetup;
  spaces?: SpacesPluginSetup;
}

/** The plugin start interface */
export interface AutomaticImportPluginStart {
  actions: ActionsPluginStart;
  inference: InferenceServerStart;
  licensing: LicensingPluginStart;
  spaces?: SpacesPluginStart;
  security: SecurityPluginStart;
}

export interface AutomaticImportPluginSetupDependencies {
  actions: ActionsPluginSetup;
  spaces?: SpacesPluginSetup;
}
export interface AutomaticImportPluginStartDependencies {
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  inference: InferenceServerStart;
  licensing: LicensingPluginStart;
  security: SecurityPluginStart;
}

export interface AutomaticImportPluginApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  actions: ActionsPluginStart;
  logger: Logger;
  getServerBasePath: () => string;
  getCurrentUser: () => Promise<AuthenticatedUser | null>;
  inference: InferenceServerStart;
  savedObjectsClient: SavedObjectsClientContract;
  checkPrivileges: () => CheckPrivileges;
  getSpaceId: () => string;
}

/**
 * @internal
 */
export type AutomaticImportPluginRequestHandlerContext = CustomRequestHandlerContext<{
  automaticImportv2: AutomaticImportPluginApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
}>;

export type AutomaticImportPluginRouter = IRouter<AutomaticImportPluginRequestHandlerContext>;

export type AutomaticImportPluginCoreSetupDependencies = CoreSetup<
  AutomaticImportPluginStartDependencies,
  AutomaticImportPluginStart
>;
