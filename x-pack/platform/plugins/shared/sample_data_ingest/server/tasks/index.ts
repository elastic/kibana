/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { InternalServices } from '../types';
import { registerInstallSampleDataTaskDefinition } from './install_sample_data';

export const registerTaskDefinitions = ({
  taskManager,
  getServices,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  getServices: () => InternalServices;
  core: CoreSetup;
}) => {
  registerInstallSampleDataTaskDefinition({
    taskManager,
    getServices,
    core,
  });
};

export {
  scheduleInstallSampleDataTask,
  getInstallTaskId,
  INSTALL_SAMPLE_DATA_TASK_TYPE,
} from './install_sample_data';
export { isTaskCurrentlyRunningError } from './utils';
