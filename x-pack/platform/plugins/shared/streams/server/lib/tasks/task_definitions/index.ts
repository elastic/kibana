/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { GetScopedClients } from '../../../routes/types';
import { createStreamsSystemIdentificationTask } from './system_identification';
import type { EbtTelemetryClient } from '../../telemetry';

export interface TaskContext {
  logger: Logger;
  getScopedClients: GetScopedClients;
  telemetry: EbtTelemetryClient;
}

export function createTaskDefinitions(taskContext: TaskContext) {
  return {
    ...createStreamsSystemIdentificationTask(taskContext),
  } satisfies TaskDefinitionRegistry;
}

export type StreamsTaskType = keyof ReturnType<typeof createTaskDefinitions>;
