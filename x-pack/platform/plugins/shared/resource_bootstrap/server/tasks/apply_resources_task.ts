/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { isLockAcquisitionError } from '@kbn/lock-manager';
import {
  TaskCost,
  throwRetryableError,
  throwUnrecoverableError,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { APPLY_TASK_TYPE } from '../../common';
import {
  runBootstrap,
  type BootstrapRunResult,
  type RunExpectation,
} from '../bootstrap/run_bootstrap';
import type { ResourceBootstrapConfig } from '../config';
import type { RequestsClient } from '../requests/requests_client';
import { toMessage } from '../to_message';
import type { InternalServices } from '../types';

const paramsSchema = schema.object({
  requestNumber: schema.number({ min: 1 }),
  expected: schema.object({
    filesHash: schema.nullable(schema.string({ maxLength: 64 })),
    settingsHash: schema.string({ maxLength: 64 }),
  }),
});

const stateSchema = schema.object({ deferrals: schema.number({ min: 0, defaultValue: 0 }) });

export const APPLY_LOCK_ID = 'resource_bootstrap:apply';

/** How long a run waits before trying again while another run holds the lock. */
export const BUSY_RETRY_DELAY_MS = 30_000;

/**
 * How many times a run leaves its request to another instance, `BUSY_RETRY_DELAY_MS` apart, before
 * it fails it: long enough for a rolling restart to replace the instances that see something else.
 */
export const MAX_DEFERRALS = 10;

/** Task Manager takes a whole number of one unit, so this rounds to seconds, at least one. */
export const toTaskTimeout = (timeout: ResourceBootstrapConfig['timeout']): string =>
  `${Math.max(1, Math.round(timeout.asSeconds()))}s`;

export const registerApplyTaskDefinition = ({
  taskManager,
  getServices,
  timeout,
  maxAttempts,
}: {
  taskManager: TaskManagerSetupContract;
  getServices: () => InternalServices;
  timeout: ResourceBootstrapConfig['timeout'];
  maxAttempts: ResourceBootstrapConfig['maxAttempts'];
}): void => {
  taskManager.registerTaskDefinitions({
    [APPLY_TASK_TYPE]: {
      title: 'Apply declarative resources',
      description:
        'Applies the resources declared in the mounted bootstrap files and records the outcome.',
      timeout: toTaskTimeout(timeout),
      maxAttempts,
      cost: TaskCost.Normal,
      paramsSchema,
      stateSchemaByVersion: {
        1: {
          schema: stateSchema,
          up: (state) => ({ deferrals: typeof state.deferrals === 'number' ? state.deferrals : 0 }),
        },
      },
      createTaskRunner: ({ taskInstance, signal }) => ({
        run: async () => {
          const { requestNumber, expected } = paramsSchema.validate(taskInstance.params);
          const { deferrals } = stateSchema.validate(taskInstance.state ?? {});
          const services = getServices();
          const state = { deferrals };

          // One lock for all runs, including a stopped run still in flight, so only one applies,
          // prunes and writes the status and ledger at a time.
          let result: BootstrapRunResult;
          try {
            result = await services.lockManager.withLock(
              APPLY_LOCK_ID,
              () =>
                runBootstrap({
                  requestNumber,
                  expected,
                  mayDefer: deferrals < MAX_DEFERRALS,
                  services,
                  signal,
                }),
              { metadata: { requestNumber } }
            );
          } catch (error) {
            if (!isLockAcquisitionError(error)) {
              throw error;
            }
            // Returning `runAt` counts as success, so waiting never uses up an attempt.
            services.logger.debug(
              'Waiting to apply the bootstrap files: another run is in progress'
            );
            return { state, runAt: new Date(Date.now() + BUSY_RETRY_DELAY_MS) };
          }

          switch (result.outcome) {
            case 'done':
              return { state, shouldDeleteTask: true };
            case 'mismatch':
              // Another instance can claim it meanwhile; like a wait, this uses up no attempt.
              services.logger.info(
                `Leaving request ${requestNumber} to apply the bootstrap files to another instance (${
                  deferrals + 1
                } of ${MAX_DEFERRALS}): ${result.reason}`
              );
              return {
                state: { deferrals: deferrals + 1 },
                runAt: new Date(Date.now() + BUSY_RETRY_DELAY_MS),
              };
            case 'permanent':
              return throwUnrecoverableError(result.error);
            case 'retryable':
              return throwRetryableError(result.error, true);
          }
        },
      }),
    },
  });
};

/**
 * Schedules one run per start, with what this instance sees, so that only an instance that sees the
 * same applies it; the run decides under the lock whether anything needs applying.
 */
export const scheduleApplyTask = async ({
  taskManager,
  requests,
  readExpectation,
}: {
  taskManager: TaskManagerStartContract;
  requests: Pick<RequestsClient, 'next'>;
  readExpectation: () => Promise<RunExpectation>;
}): Promise<string> => {
  const expected = await readExpectation();
  const { id } = await taskManager.schedule({
    taskType: APPLY_TASK_TYPE,
    params: { requestNumber: await requests.next(), expected },
    state: { deferrals: 0 },
  });
  return id;
};

/** The wait before the second attempt to schedule, doubling up to `maxTimeout` for each one after. */
export const SCHEDULE_RETRY_OPTIONS = { minTimeout: 1_000, maxTimeout: 5 * 60_000, factor: 2 };

/**
 * Schedules the run of this start, retrying until it succeeds or `signal` aborts, since nothing
 * else asks for a run before the next start and only a run writes the status.
 */
export const scheduleApplyTaskWithRetry = ({
  taskManager,
  requests,
  readExpectation,
  logger,
  signal,
}: {
  taskManager: TaskManagerStartContract;
  requests: Pick<RequestsClient, 'next'>;
  readExpectation: () => Promise<RunExpectation>;
  logger: Logger;
  signal: AbortSignal;
}): Promise<string> =>
  pRetry(
    () => {
      if (signal.aborted) {
        throw new pRetry.AbortError('Kibana is stopping');
      }
      return scheduleApplyTask({ taskManager, requests, readExpectation });
    },
    {
      ...SCHEDULE_RETRY_OPTIONS,
      forever: true,
      // A pending retry must not keep a stopping Kibana alive.
      unref: true,
      onFailedAttempt: (error) => {
        logger.warn(
          `Failed to schedule the resource bootstrap (attempt ${
            error.attemptNumber
          }), retrying: ${toMessage(error)}`
        );
      },
    }
  );
