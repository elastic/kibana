/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePodPlugin } from '@kbn/task-manager-plugin/server/task_pod';
import { maintenanceWindowSavedObjectType } from './saved_objects';

/**
 * Registers the maintenance window saved object type in a task pod, so tasks can read maintenance
 * windows through an internal repository. Maintenance window clients and tasks are not available.
 */
export const podPlugins = [
  definePodPlugin({
    id: 'maintenanceWindows',
    setup: (core) => {
      core.savedObjects.registerType(maintenanceWindowSavedObjectType);
    },
  }),
];
