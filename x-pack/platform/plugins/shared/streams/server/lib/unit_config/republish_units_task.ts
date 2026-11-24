/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { EncryptionError } from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import { StatusError } from '../streams/errors/status_error';
import { combineAbortSignals } from './combine_abort_signals';
import type { RepublishUnitOutcome } from './types';

export const REPUBLISH_UNITS_TASK_TYPE = 'streams:republish-units';
export const REPUBLISH_UNITS_TASK_ID = REPUBLISH_UNITS_TASK_TYPE;

// The distributor expects a re-issue every 30-60 minutes. The wrap key renews days before expiry.
const REPUBLISH_UNITS_INTERVAL = '30m';

export interface UnitRepublisher {
  listUnitIds: () => Promise<string[]>;
  republishUnit: (unitId: string, signal: AbortSignal) => Promise<RepublishUnitOutcome>;
}

const isOperatorError = (error: unknown): boolean =>
  (error instanceof StatusError && error.statusCode === 503) || error instanceof EncryptionError;

/** Republishes every stored unit once. Throws after the loop if any unit failed, so Task Manager records a failed run. */
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
  let failedCount = 0;

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
      // A stop or timeout mid-request rejects the fetch, which is not a distributor failure.
      if (signal.aborted) {
        logger.debug(`Republish of Streams unit [${unitId}] aborted: ${error}`);
        return;
      }
      const message = `Failed to republish Streams unit [${unitId}], the next run retries: ${error}`;
      // A 503 (missing key, key path or target id) or an undecryptable document needs an operator. Retrying does not help.
      if (isOperatorError(error)) {
        logger.error(message);
      } else {
        logger.warn(message);
      }
      failedCount++;
    }
  }

  if (failedCount > 0) {
    throw new Error(`Failed to republish ${failedCount} of ${unitIds.length} Streams units`);
  }
};

/** Registers the task type whether or not republish is enabled, so a leftover scheduled task stays recognized. */
export const registerRepublishUnitsTask = ({
  taskManager,
  logger,
  enabled,
  getRepublisher,
  stopSignal,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  enabled: boolean;
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
          // Start removes the task when disabled, but a run can be claimed before that.
          if (!enabled) {
            return { state: {} };
          }
          const runSignal = combineAbortSignals([signal, stopSignal]);
          try {
            await runRepublishUnits({
              republisher: await getRepublisher(),
              logger,
              signal: runSignal.signal,
            });
          } catch (error) {
            if (runSignal.signal.aborted) {
              logger.debug(`Streams unit republish run aborted: ${error}`);
              return { state: {} };
            }
            // A plain error keeps the recurring schedule. throwUnrecoverableError would stop the task.
            throw error;
          } finally {
            // The stop signal lives as long as the plugin, so a run must not leave a listener on it.
            runSignal.dispose();
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

export const removeRepublishUnitsTask = async ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}): Promise<void> => {
  try {
    await taskManager.removeIfExists(REPUBLISH_UNITS_TASK_ID);
  } catch (error) {
    logger.warn(`Failed to remove ${REPUBLISH_UNITS_TASK_ID}: ${error}`);
  }
};
