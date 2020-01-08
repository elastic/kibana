/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'src/legacy/server/kbn_server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../plugins/kibana_task_manager/server';

export function getTaskManagerSetup(server: Server): TaskManagerSetupContract | undefined {
  return server?.newPlatform?.setup?.plugins?.kibanaTaskManager as TaskManagerSetupContract;
}

export function getTaskManagerStart(server: Server): TaskManagerStartContract | undefined {
  return server?.newPlatform?.start?.plugins?.kibanaTaskManager as TaskManagerStartContract;
}
