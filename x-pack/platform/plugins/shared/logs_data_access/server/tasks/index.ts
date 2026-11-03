/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import { uiSettings } from '../../common/ui_settings';
import { registerServices } from '../services/register_services';
import { logsDataAccessBridge } from './bridge';

export type LogsDataAccessTasksStart = ReturnType<typeof createStart>;

const createStart = (
  { logger }: { logger: PluginInitializerContext['logger'] },
  core: Pick<CoreTasksStart, 'savedObjects' | 'uiSettings'>
) => ({
  services: registerServices({
    logger: logger.get(),
    deps: { savedObjects: core.savedObjects as never, uiSettings: core.uiSettings as never },
  }),
});

/**
 * Logs data access for a task pod: the log sources setting and the same services as the plugin's
 * `server` entry. In Kibana this entry hands out the plugin's own contracts (see `bridge.ts`).
 */
class LogsDataAccessTasksPlugin implements TasksPlugin<void, LogsDataAccessTasksStart> {
  constructor(private readonly context: PluginInitializerContext) {}

  setup(core: CoreTasksSetup) {
    if (logsDataAccessBridge.getSetup()) return;
    core.uiSettings.register(uiSettings as never);
  }

  start(core: CoreTasksStart): LogsDataAccessTasksStart {
    return logsDataAccessBridge.getStart() ?? createStart(this.context, core);
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new LogsDataAccessTasksPlugin(context);
