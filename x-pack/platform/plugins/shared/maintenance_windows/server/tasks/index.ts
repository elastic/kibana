/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, TasksPlugin, CoreTasksSetup } from '@kbn/core/server';

import { maintenanceWindowsBridge } from './bridge';
import { maintenanceWindowSavedObjectType } from '../saved_objects';

/**
 * Registers the maintenance window saved object type, so tasks can read maintenance windows
 * through an internal repository. Maintenance window clients and tasks are not available.
 */
class MaintenanceWindowsTasksPlugin implements TasksPlugin {
  setup(core: CoreTasksSetup) {
    // In Kibana the `server` entry already registered it.
    if (maintenanceWindowsBridge.getSetup()) return;
    core.savedObjects.registerType(maintenanceWindowSavedObjectType);
  }

  start() {}
}

export const plugin = async (_context: PluginInitializerContext) =>
  new MaintenanceWindowsTasksPlugin();
