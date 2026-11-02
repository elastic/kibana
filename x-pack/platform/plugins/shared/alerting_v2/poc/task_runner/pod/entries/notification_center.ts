/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * "Control" pod: Notification Center's retention cleanup task, registered with its real,
 * unmodified `registerNotificationCleanupTask` function. Unlike Stage A, this task is not a DI
 * consumer — it closes over `core.getStartServices()` the way most of Kibana's ~115 task-
 * registering files do — so this entry is the generalization control: it proves the *generic pod
 * harness* (`pod/server.ts`, `TaskRegistry`, the `/health` + `/run` + `/cancel` contract) needs
 * zero task-specific code, while the task-specific glue (faking `CoreSetup.getStartServices()`)
 * still has to be written per task, same as Stage A's DI-container wiring.
 */
import { Client } from '@elastic/elasticsearch';
import { registerNotificationCleanupTask } from '../../../../../notification_center/server/cleanup_task/cleanup_task';
import { ConsoleLogger } from '../../ports/console_logger';
import { FakeTaskManagerSetup } from '../fake_core';
import type { TaskRegistry } from '../server';

const buildClientOptions = () => {
  const { ES_URL, ES_API_KEY, ES_USERNAME, ES_PASSWORD } = process.env;
  if (!ES_URL) throw new Error('ES_URL is required');
  return {
    node: ES_URL,
    auth: ES_API_KEY ? { apiKey: ES_API_KEY } : { username: ES_USERNAME ?? 'elastic', password: ES_PASSWORD ?? 'changeme' },
  };
};

export const buildNotificationCenterPod = (): { registry: TaskRegistry; internalClient: Client } => {
  const internalClient = new Client(buildClientOptions());
  const logger = new ConsoleLogger('plugins.notificationCenter', (process.env.LOG_LEVEL as never) ?? 'info');
  const taskManagerSetup = new FakeTaskManagerSetup();

  // The only task-specific fake: a `CoreSetup` exposing just `getStartServices().elasticsearch`,
  // which is all this task's `createTaskRunner` closure reads.
  const fakeCoreSetup = {
    getStartServices: async () => [
      { elasticsearch: { client: { asInternalUser: internalClient } } },
      {},
      {},
    ],
  };

  registerNotificationCleanupTask(fakeCoreSetup as never, taskManagerSetup as never, logger as never);

  const registry: TaskRegistry = new Map();
  for (const [taskType, definition] of taskManagerSetup.definitions) {
    registry.set(taskType, (ctx) => definition.createTaskRunner({ ...ctx } as never));
  }

  return { registry, internalClient };
};
