/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, PluginInitializerContext } from 'kibana/server';
import { Legacy } from 'kibana';
import { isFunction } from 'lodash';
import { PLUGIN_ID } from './constants';
import { OssTelemetryPlugin } from './server/plugin';
import { LegacyPluginInitializer } from '../../../../src/legacy/plugin_discovery/types';
import { TaskManager } from '../task_manager';

export const ossTelemetry: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    require: ['elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.oss_telemetry',

    init(server: Legacy.Server) {
      const plugin = new OssTelemetryPlugin({
        logger: {
          get: () =>
            ({
              info: (message: string) => server.log(['info', 'task_manager'], message),
              debug: (message: string) => server.log(['debug', 'task_manager'], message),
              warn: (message: string) => server.log(['warn', 'task_manager'], message),
              error: (message: string) => server.log(['error', 'task_manager'], message),
            } as Logger),
        },
      } as PluginInitializerContext);
      plugin.setup(server.newPlatform.setup.core, {
        usageCollection: server.newPlatform.setup.plugins.usageCollection,
        taskManager: getTaskManager(server),
        __LEGACY: {
          config: server.config(),
          xpackMainStatus: ((server.plugins.xpack_main as unknown) as { status: any }).status
            .plugin,
        },
      });
    },
  });
};

function getTaskManager(server: Legacy.Server) {
  const taskManager = {
    ...(server?.newPlatform?.setup?.plugins?.kibanaTaskManager || {}),
    ...(server?.newPlatform?.start?.plugins?.kibanaTaskManager || {}),
  } as TaskManager;
  return isFunction(taskManager.ensureScheduled) ? taskManager : undefined;
}
