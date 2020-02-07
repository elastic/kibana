/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { Legacy } from 'kibana';
import { LegacySpacesPlugin as SpacesPluginStartContract } from '../../spaces';
import {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '../../../../plugins/task_manager/server';
import { getTaskManagerSetup, getTaskManagerStart } from '../../task_manager/server';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
import KbnServer from '../../../../../src/legacy/server/kbn_server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../../../plugins/encrypted_saved_objects/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import {
  CoreSetup,
  LoggerFactory,
  SavedObjectsLegacyService,
} from '../../../../../src/core/server';
import {
  ActionsPlugin,
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '../../../../plugins/actions/server';
import { LicensingPluginSetup } from '../../../../plugins/licensing/server';

// Extend PluginProperties to indicate which plugins are guaranteed to exist
// due to being marked as dependencies
interface Plugins extends Hapi.PluginProperties {
  actions: ActionsPlugin;
}

export interface Server extends Legacy.Server {
  plugins: Plugins;
}

/**
 * Shim what we're thinking setup and start contracts will look like
 */
export type SecurityPluginSetupContract = Pick<SecurityPluginSetup, '__legacyCompat'>;
export type SecurityPluginStartContract = Pick<SecurityPluginSetup, 'authc'>;
export type XPackMainPluginSetupContract = Pick<XPackMainPlugin, 'registerFeature'>;

/**
 * New platform interfaces
 */
export interface AlertingPluginInitializerContext {
  logger: LoggerFactory;
}
export interface AlertingCoreSetup {
  elasticsearch: CoreSetup['elasticsearch'];
  http: {
    route: (route: Hapi.ServerRoute) => void;
    basePath: {
      serverBasePath: string;
    };
  };
}
export interface AlertingCoreStart {
  savedObjects: SavedObjectsLegacyService;
}
export interface AlertingPluginsSetup {
  security?: SecurityPluginSetupContract;
  taskManager: TaskManagerSetupContract;
  actions: ActionsPluginSetupContract;
  xpack_main: XPackMainPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
}
export interface AlertingPluginsStart {
  actions: ActionsPluginStartContract;
  security?: SecurityPluginStartContract;
  spaces: () => SpacesPluginStartContract | undefined;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
}

/**
 * Shim
 *
 * @param server Hapi server instance
 */
export function shim(
  server: Server
): {
  initializerContext: AlertingPluginInitializerContext;
  coreSetup: AlertingCoreSetup;
  coreStart: AlertingCoreStart;
  pluginsSetup: AlertingPluginsSetup;
  pluginsStart: AlertingPluginsStart;
} {
  const newPlatform = ((server as unknown) as KbnServer).newPlatform;

  const initializerContext: AlertingPluginInitializerContext = {
    logger: newPlatform.coreContext.logger,
  };

  const coreSetup: AlertingCoreSetup = {
    elasticsearch: newPlatform.setup.core.elasticsearch,
    http: {
      route: server.route.bind(server),
      basePath: newPlatform.setup.core.http.basePath,
    },
  };

  const coreStart: AlertingCoreStart = {
    savedObjects: server.savedObjects,
  };

  const pluginsSetup: AlertingPluginsSetup = {
    security: newPlatform.setup.plugins.security as SecurityPluginSetupContract | undefined,
    taskManager: getTaskManagerSetup(server)!,
    actions: newPlatform.setup.plugins.actions as ActionsPluginSetupContract,
    xpack_main: server.plugins.xpack_main,
    encryptedSavedObjects: newPlatform.setup.plugins
      .encryptedSavedObjects as EncryptedSavedObjectsPluginSetup,
    licensing: newPlatform.setup.plugins.licensing as LicensingPluginSetup,
  };

  const pluginsStart: AlertingPluginsStart = {
    security: newPlatform.setup.plugins.security as SecurityPluginStartContract | undefined,
    actions: newPlatform.start.plugins.actions as ActionsPluginStartContract,
    // TODO: Currently a function because it's an optional dependency that
    // initializes after this function is called
    spaces: () => server.plugins.spaces,
    encryptedSavedObjects: newPlatform.start.plugins
      .encryptedSavedObjects as EncryptedSavedObjectsPluginStart,
    taskManager: getTaskManagerStart(server)!,
  };

  return {
    initializerContext,
    coreSetup,
    coreStart,
    pluginsSetup,
    pluginsStart,
  };
}
