/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import {
  SIGNAL_GENERATOR_SCHEDULE_INTERVAL,
  SIGNAL_GENERATOR_TASK_ID,
  SIGNAL_GENERATOR_TASK_TYPE,
} from '../../common/constants';
import type { SignalsServiceApi } from '../signals/service';
import { generateSignals } from './generate_signals';
import type { SignalGeneratorTaskState } from './generate_signals';

const stateSchemaV1 = schema.object({
  watermark: schema.maybe(schema.string()),
});

export interface RegisterSignalGeneratorTaskDefinitionDeps {
  taskManager: TaskManagerSetupContract;
  getEsClient: () => ElasticsearchClient;
  getSignalsService: () => SignalsServiceApi;
  getFeedbackLoopEnabled: () => Promise<boolean>;
  logger: Logger;
}

/** Registers the global signal-generator task type. */
export const registerSignalGeneratorTaskDefinition = ({
  taskManager,
  getEsClient,
  getSignalsService,
  getFeedbackLoopEnabled,
  logger,
}: RegisterSignalGeneratorTaskDefinitionDeps): void => {
  taskManager.registerTaskDefinitions({
    [SIGNAL_GENERATOR_TASK_TYPE]: {
      title: 'Context Engine signal generator',
      description:
        'Turns Agent Builder tool-call trace spans into classified Context Engine signals (feedback loop).',
      timeout: '5m',
      maxAttempts: 3,
      cost: TaskCost.Normal,
      stateSchemaByVersion: {
        1: { schema: stateSchemaV1, up: (state) => state },
      },
      createTaskRunner: ({ taskInstance, signal }) => {
        return {
          async run(): Promise<{ state: SignalGeneratorTaskState }> {
            const state = (taskInstance.state ?? {}) as SignalGeneratorTaskState;

            if (!(await getFeedbackLoopEnabled())) {
              return { state };
            }

            const nextState = await generateSignals({
              esClient: getEsClient(),
              signalsService: getSignalsService(),
              logger,
              state,
              signal,
            });

            return { state: nextState };
          },
        };
      },
    },
  });
};

/** Schedules the global signal-generation task; idempotent. */
export const scheduleSignalGenerator = async ({
  taskManager,
}: {
  taskManager: TaskManagerStartContract;
}): Promise<void> => {
  await taskManager.ensureScheduled({
    id: SIGNAL_GENERATOR_TASK_ID,
    taskType: SIGNAL_GENERATOR_TASK_TYPE,
    schedule: { interval: SIGNAL_GENERATOR_SCHEDULE_INTERVAL },
    params: {},
    state: {},
  });
};
