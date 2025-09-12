/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SampleDataManager } from './services/sample_data_manager';

export interface SampleDataSetupDependencies {
  taskManager: TaskManagerSetupContract;
}

export interface SampleDataStartDependencies {
  taskManager: TaskManagerStartContract;
}

export interface InternalServices {
  logger: Logger;
  sampleDataManager: SampleDataManager;
  taskManager: TaskManagerStartContract;
}
