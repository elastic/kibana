/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { InternalServices } from '../types';
import { registerEnsureUpToDateTaskDefinition } from './ensure_up_to_date';
import { registerInstallAllTaskDefinition } from './install_all';
import { registerUninstallAllTaskDefinition } from './uninstall_all';

export const registerTaskDefinitions = ({
  getServices,
  taskManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
}) => {
  registerEnsureUpToDateTaskDefinition({ getServices, taskManager });
  registerInstallAllTaskDefinition({ getServices, taskManager });
  registerUninstallAllTaskDefinition({ getServices, taskManager });
};

export { scheduleEnsureUpToDateTask, ENSURE_DOC_UP_TO_DATE_TASK_ID } from './ensure_up_to_date';
export { scheduleInstallAllTask, INSTALL_ALL_TASK_ID } from './install_all';
export { scheduleUninstallAllTask, UNINSTALL_ALL_TASK_ID } from './uninstall_all';
export { waitUntilTaskCompleted, getTaskStatus } from './utils';
