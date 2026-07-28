/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type { EventTypeDefinition, ListenerDefinition } from './types';

export const EXAMPLE_EVENT_TYPE = 'example.event';
export const EXAMPLE_TASK_TYPE = 'event_router:example_work';

const paramsSchema = schema.object({
  eventId: schema.string(),
  eventType: schema.string(),
  spaceId: schema.string(),
});

export const exampleEventType: EventTypeDefinition = {
  type: EXAMPLE_EVENT_TYPE,
  payloadSchema: schema.object({ message: schema.maybe(schema.string()) }, { unknowns: 'allow' }),
};

/**
 * The work a listener hands off. It runs on whichever node Task Manager claims
 * it on, exactly once, which is the guarantee the router itself never tries to
 * provide.
 */
export const registerExampleTaskType = ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}): void => {
  taskManager.registerTaskDefinitions({
    [EXAMPLE_TASK_TYPE]: {
      title: 'Event router example work',
      description:
        'Prototype consumer for the event router: proves a routed event results in a durable task that runs on exactly one node.',
      // The task only logs, so it either finishes immediately or is wedged.
      timeout: '30s',
      // One-shot work: a duplicate run would mean the event is processed twice.
      maxAttempts: 1,
      cost: TaskCost.Tiny,
      paramsSchema,
      createTaskRunner: ({ taskInstance }) => ({
        run: async () => {
          const { eventId, eventType, spaceId } = taskInstance.params;
          logger.info(
            `Processed routed event ${eventId} of type "${eventType}" in space "${spaceId}"`
          );
          return { state: {} };
        },
      }),
    },
  });
};

export const createExampleListener = ({
  getTaskManager,
}: {
  getTaskManager: () => TaskManagerStartContract;
}): ListenerDefinition => ({
  id: 'exampleWork',
  filter: { types: [EXAMPLE_EVENT_TYPE] },
  handler: async (event) => {
    // Deriving the task id from the event id makes the enqueue idempotent:
    // a producer retry after a partial failure re-enqueues nothing.
    await getTaskManager().ensureScheduled({
      id: `${EXAMPLE_TASK_TYPE}:${event.id}`,
      taskType: EXAMPLE_TASK_TYPE,
      params: { eventId: event.id, eventType: event.type, spaceId: event.spaceId },
      state: {},
    });
  },
});
