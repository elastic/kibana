/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type { RepublishUnitOutcome } from './types';

export const REPUBLISH_UNITS_TASK_TYPE = 'streams:republish-units';
export const REPUBLISH_UNITS_TASK_ID = REPUBLISH_UNITS_TASK_TYPE;

// The distributor expects a re-issue every 30-60 minutes. The wrap key renews days before expiry.
const REPUBLISH_UNITS_INTERVAL = '30m';

export interface UnitRepublisher {
  listUnitIds: () => Promise<string[]>;
  republishUnit: (unitId: string, signal: AbortSignal) => Promise<RepublishUnitOutcome>;
}

/** Republishes every stored unit once. A failing unit is logged and the next run retries it. */
export const runRepublishUnits = async ({
  republisher,
  logger,
  signal,
}: {
  republisher: UnitRepublisher;
  logger: Logger;
  signal: AbortSignal;
}): Promise<void> => {
  const unitIds = await republisher.listUnitIds();

  for (const unitId of unitIds) {
    if (signal.aborted) {
      return;
    }

    try {
      const outcome = await republisher.republishUnit(unitId, signal);
      if (outcome === 'resealed') {
        logger.info(`Re-sealed credentials of Streams unit [${unitId}] and republished it`);
      } else {
        logger.debug(`Republish of Streams unit [${unitId}]: ${outcome}`);
      }
    } catch (error) {
      logger.warn(`Failed to republish Streams unit [${unitId}], the next run retries: ${error}`);
    }
  }
};

export const registerRepublishUnitsTask = ({
  taskManager,
  logger,
  getRepublisher,
  stopSignal,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getRepublisher: () => Promise<UnitRepublisher>;
  /** Aborted when the plugin stops. Task manager aborts the run signal only on timeout. */
  stopSignal: AbortSignal;
}): void => {
  taskManager.registerTaskDefinitions({
    [REPUBLISH_UNITS_TASK_TYPE]: {
      title: 'Streams unit republish',
      description:
        'Re-sends every stored Streams unit to config-distributor and re-seals its credentials after a wrap key rotation.',
      // Assumes one unit per cluster, which is what exists today. No progress state across runs.
      timeout: '2m',
      cost: TaskCost.Normal,
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          const runController = new AbortController();
          const abortRun = () => runController.abort();
          signal.addEventListener('abort', abortRun);
          stopSignal.addEventListener('abort', abortRun);
          if (signal.aborted || stopSignal.aborted) {
            abortRun();
          }
          try {
            await runRepublishUnits({
              republisher: await getRepublisher(),
              logger,
              signal: runController.signal,
            });
          } catch (error) {
            logger.warn(`Streams unit republish run failed, the next run retries: ${error}`);
          } finally {
            // The stop signal lives as long as the plugin, so a run must not leave a listener on it.
            signal.removeEventListener('abort', abortRun);
            stopSignal.removeEventListener('abort', abortRun);
          }
          return { state: {} };
        },
      }),
    },
  });
};

export const scheduleRepublishUnitsTask = async ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}): Promise<void> => {
  try {
    await taskManager.ensureScheduled({
      id: REPUBLISH_UNITS_TASK_ID,
      taskType: REPUBLISH_UNITS_TASK_TYPE,
      schedule: { interval: REPUBLISH_UNITS_INTERVAL },
      params: {},
      state: {},
    });
  } catch (error) {
    logger.error(`Failed to schedule ${REPUBLISH_UNITS_TASK_ID}: ${error}`);
    return;
  }

  // Picks up a rotation that happened while Kibana was down. Refused while a run is in flight.
  try {
    await taskManager.runSoon(REPUBLISH_UNITS_TASK_ID);
  } catch (error) {
    logger.debug(`Did not run ${REPUBLISH_UNITS_TASK_ID} on start: ${error}`);
  }
};
