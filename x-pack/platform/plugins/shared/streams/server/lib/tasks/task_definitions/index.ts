/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { GetScopedClients } from '../../../routes/types';

export interface TaskContext {
  getScopedClients: GetScopedClients;
}

export function createTaskDefinitions(taskContext: TaskContext) {
  return {} satisfies TaskDefinitionRegistry;
}

export type StreamsTaskType = keyof ReturnType<typeof createTaskDefinitions>;
