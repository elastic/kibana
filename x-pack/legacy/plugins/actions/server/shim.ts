/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { Legacy } from 'kibana';
import * as Rx from 'rxjs';
import { ActionsConfigType } from './types';
import { TaskManager } from '../../task_manager/server';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
import KbnServer from '../../../../../src/legacy/server/kbn_server';
import { LegacySpacesPlugin as SpacesPluginStartContract } from '../../spaces';
import {
  PluginSetupContract as EncryptedSavedObjectsSetupContract,
  PluginStartContract as EncryptedSavedObjectsStartContract,
} from '../../../../plugins/encrypted_saved_objects/server';
import { PluginSetupContract as SecurityPlugin } from '../../../../plugins/security/server';
import {
  CoreSetup,
  LoggerFactory,
  SavedObjectsLegacyService,
} from '../../../../../src/core/server';
import { LicensingPluginSetup } from '../../../../plugins/licensing/server';
import { IEventLogService } from '../../../../plugins/event_log/server';

// Extend PluginProperties to indicate which plugins are guaranteed to exist
// due to being marked as dependencies
interface Plugins extends Hapi.PluginProperties {
  task_manager: TaskManager;
}

export interface Server extends Legacy.Server {
  plugins: Plugins;
}

export interface KibanaConfig {
  index: string;
}

/**
 * Shim what we're thinking setup and start contracts will look like
 */
export type TaskManagerStartContract = Pick<TaskManager, 'schedule' | 'fetch' | 'remove'>;
export type XPackMainPluginSetupContract = Pick<XPackMainPlugin, 'registerFeature'>;
export type SecurityPluginSetupContract = Pick<SecurityPlugin, '__legacyCompat'>;
export type SecurityPluginStartContract = Pick<SecurityPlugin, 'authc'>;
export type TaskManagerSetupContract = Pick<
  TaskManager,
  'addMiddleware' | 'registerTaskDefinitions'
>;

/**
 * New platform interfaces
 */
export interface ActionsPluginInitializerContext {
  logger: LoggerFactory;
  config: {
    kibana$: Rx.Observable<KibanaConfig>;
    create(): Rx.Observable<ActionsConfigType>;
  };
}
export interface ActionsCoreSetup {
  elasticsearch: CoreSetup['elasticsearch'];
  http: {
    route: (route: Hapi.ServerRoute) => void;
    basePath: {
      serverBasePath: string;
    };
  };
}
export interface ActionsCoreStart {
  savedObjects: SavedObjectsLegacyService;
}
export interface ActionsPluginsSetup {
  security?: SecurityPluginSetupContract;
  task_manager: TaskManagerSetupContract;
  xpack_main: XPackMainPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsSetupContract;
  licensing: LicensingPluginSetup;
  event_log: IEventLogService;
}
export interface ActionsPluginsStart {
  security?: SecurityPluginStartContract;
  spaces: () => SpacesPluginStartContract | undefined;
  encryptedSavedObjects: EncryptedSavedObjectsStartContract;
  task_manager: TaskManagerStartContract;
}

/**
 * Shim
 *
 * @param server Hapi server instance
 */
export function shim(
  server: Server
): {
  initializerContext: ActionsPluginInitializerContext;
  coreSetup: ActionsCoreSetup;
  coreStart: ActionsCoreStart;
  pluginsSetup: ActionsPluginsSetup;
  pluginsStart: ActionsPluginsStart;
} {
  const newPlatform = ((server as unknown) as KbnServer).newPlatform;

  const initializerContext: ActionsPluginInitializerContext = {
    logger: newPlatform.coreContext.logger,
    config: {
      kibana$: Rx.of({
        index: server.config().get('kibana.index'),
      }),
      create() {
        return Rx.of({
          enabled: server.config().get('xpack.actions.enabled') as boolean,
          whitelistedHosts: server.config().get('xpack.actions.whitelistedHosts') as string[],
          enabledActionTypes: server.config().get('xpack.actions.enabledActionTypes') as string[],
        }) as Rx.Observable<ActionsConfigType>;
      },
    },
  };

  const coreSetup: ActionsCoreSetup = {
    elasticsearch: newPlatform.setup.core.elasticsearch,
    http: {
      route: server.route.bind(server),
      basePath: newPlatform.setup.core.http.basePath,
    },
  };

  const coreStart: ActionsCoreStart = {
    savedObjects: server.savedObjects,
  };

  const pluginsSetup: ActionsPluginsSetup = {
    security: newPlatform.setup.plugins.security as SecurityPluginSetupContract | undefined,
    task_manager: server.plugins.task_manager,
    xpack_main: server.plugins.xpack_main,
    encryptedSavedObjects: newPlatform.setup.plugins
      .encryptedSavedObjects as EncryptedSavedObjectsSetupContract,
    licensing: newPlatform.setup.plugins.licensing as LicensingPluginSetup,
    event_log: newPlatform.setup.plugins.event_log as IEventLogService,
  };

  const pluginsStart: ActionsPluginsStart = {
    security: newPlatform.setup.plugins.security as SecurityPluginStartContract | undefined,
    // TODO: Currently a function because it's an optional dependency that
    // initializes after this function is called
    spaces: () => server.plugins.spaces,
    encryptedSavedObjects: newPlatform.start.plugins
      .encryptedSavedObjects as EncryptedSavedObjectsStartContract,
    task_manager: server.plugins.task_manager,
  };

  return {
    initializerContext,
    coreSetup,
    coreStart,
    pluginsSetup,
    pluginsStart,
  };
}
