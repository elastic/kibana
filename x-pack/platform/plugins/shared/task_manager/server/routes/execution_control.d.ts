/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, SecurityServiceStart } from '@kbn/core/server';
import type { TaskExecutionControlService } from '../execution_control';
import type { TaskTypeDictionary } from '../task_type_dictionary';
export interface ExecutionControlRouteParams {
  router: IRouter;
  logger: Logger;
  getSecurity: () => Promise<SecurityServiceStart>;
  getExecutionControlService: () => Promise<TaskExecutionControlService>;
  getDefinitions: () => TaskTypeDictionary;
}
export declare function executionControlRoutes(params: ExecutionControlRouteParams): void;
