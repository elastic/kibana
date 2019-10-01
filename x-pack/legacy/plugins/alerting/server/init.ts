/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { Legacy } from 'kibana';
import KbnServer from 'src/legacy/server/kbn_server';
import { Plugin } from './plugin';
import { ActionsPlugin } from '../../actions';
import { TaskManager } from '../../task_manager';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import { PluginSetupContract as SecurityPluginSetupContract } from '../../../../plugins/security/server';

// Extend PluginProperties to indicate which plugins are guaranteed to exist
// due to being marked as dependencies
interface Plugins extends Hapi.PluginProperties {
  actions: ActionsPlugin;
  task_manager: TaskManager;
  encrypted_saved_objects: EncryptedSavedObjectsPlugin;
}

interface Server extends Legacy.Server {
  plugins: Plugins;
}

export function init(server: Server) {
  const coreSetup = {
    elasticsearch: server.plugins.elasticsearch,
    savedObjects: server.savedObjects,
    http: {
      route: server.route.bind(server),
      basePath: ((server as unknown) as KbnServer).newPlatform.setup.core.http.basePath,
    },
  };
  const pluginsSetup = {
    security: ((server as unknown) as KbnServer).newPlatform.setup.plugins.security as
      | SecurityPluginSetupContract
      | undefined,
    task_manager: server.plugins.task_manager,
    // TODO: Currently a function because it's an optional dependency that
    // initializes after this function is called
    spaces: () => server.plugins.spaces,
    actions: server.plugins.actions,
    xpack_main: server.plugins.xpack_main,
    encrypted_saved_objects: server.plugins.encrypted_saved_objects,
  };

  const plugin = new Plugin({
    logger: {
      get: () => ({
        info: (message: string) => server.log(['info', 'task_manager'], message),
        debug: (message: string) => server.log(['debug', 'task_manager'], message),
        warn: (message: string) => server.log(['warn', 'task_manager'], message),
        error: (message: string) => server.log(['error', 'task_manager'], message),
      }),
    },
  });

  const setupContract = plugin.setup(coreSetup, pluginsSetup);

  server.decorate('request', 'getAlertsClient', function() {
    return setupContract.getAlertsClientWithRequest(this);
  });
  server.expose(setupContract);
}
