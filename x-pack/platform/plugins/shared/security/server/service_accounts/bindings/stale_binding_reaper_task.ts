/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs';

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';

import type { StaleBindingReaper, StaleBindingReaperState } from './stale_binding_reaper';
import type { OnlineStatusRetryScheduler } from '../../elasticsearch';
import { createOnlineStatusTaskRunner } from '../../elasticsearch';
import { getDetailedErrorMessage } from '../../errors';

export const SERVICE_ACCOUNT_BINDING_CLEANUP_TASK_TYPE = 'service_account_binding_cleanup';

/** The task's ID. There is one task per cluster. */
const TASK_ID = SERVICE_ACCOUNT_BINDING_CLEANUP_TASK_TYPE;

const stateSchemaV1 = schema.object({
  sweep: schema.maybe(
    schema.object({
      cutoff: schema.string(),
      afterKey: schema.maybe(schema.string()),
    })
  ),
  firstSeenUnregistered: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
});

const EMPTY_STATE: StaleBindingReaperState = { firstSeenUnregistered: {} };

/**
 * The Task Manager task that runs the {@link StaleBindingReaper} on a schedule. It is registered
 * whether or not service accounts are enabled, so a task left from a deployment that once enabled
 * them still has a definition to run. It is only scheduled when they are enabled, and a run does
 * nothing while they are not.
 */
export class StaleBindingCleanupTask {
  private readonly logger: Logger;
  private reaper?: StaleBindingReaper;
  private isAvailable: () => boolean = () => false;
  private statusSubscription?: Subscription;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  setup({ taskManager }: { taskManager: TaskManagerSetupContract }): void {
    taskManager.registerTaskDefinitions({
      [SERVICE_ACCOUNT_BINDING_CLEANUP_TASK_TYPE]: {
        title: 'Remove stale service account workload bindings',
        description:
          'Removes workload bindings whose service account, workload or workload type no longer exists.',
        // A run stops starting work after two minutes, then waits for the deletes it already sent.
        timeout: '5m',
        cost: TaskCost.Normal,
        priority: TaskPriority.Maintenance,
        stateSchemaByVersion: {
          1: {
            schema: stateSchemaV1,
            up: (state: Record<string, unknown>) => ({
              sweep: state.sweep,
              firstSeenUnregistered: state.firstSeenUnregistered ?? {},
            }),
          },
        },
        createTaskRunner: ({ taskInstance, signal }) => ({
          run: async () => {
            const state = stateSchemaV1.validate(taskInstance.state ?? {});
            const { sweep, firstSeenUnregistered } = await this.runOnce(state, signal);
            return { state: { sweep, firstSeenUnregistered } };
          },
        }),
      },
    });
  }

  /**
   * Hands the task its reaper and schedules it once Elasticsearch is available. Pass no reaper
   * when service accounts are disabled: the task is then not scheduled, and a run already
   * scheduled does nothing. `isAvailable` is checked before every run, since the license and the
   * encryption key decide whether bindings can be read at all.
   */
  start({
    taskManager,
    reaper,
    isAvailable,
    interval,
    online$,
  }: {
    taskManager: TaskManagerStartContract;
    reaper?: StaleBindingReaper;
    isAvailable: () => boolean;
    interval: string;
    online$: Observable<OnlineStatusRetryScheduler>;
  }): void {
    this.reaper = reaper;
    this.isAvailable = isAvailable;
    if (!reaper) {
      return;
    }

    this.statusSubscription = online$
      .pipe(switchMap(createOnlineStatusTaskRunner(() => this.schedule(taskManager, interval))))
      .subscribe();
  }

  stop(): void {
    this.statusSubscription?.unsubscribe();
    this.statusSubscription = undefined;
  }

  /**
   * Runs the reaper once. A failure is logged and the state kept as it was, so the next run picks
   * up where the last one that finished left off.
   */
  private async runOnce(
    state: StaleBindingReaperState,
    signal: AbortSignal
  ): Promise<StaleBindingReaperState> {
    if (!this.reaper) {
      this.logger.debug('Service accounts are not enabled, skipping the stale binding cleanup.');
      return state;
    }
    if (!this.isAvailable()) {
      this.logger.debug(
        'Security is disabled or saved object encryption is not available, skipping the stale binding cleanup.'
      );
      return state;
    }

    try {
      return await this.reaper.run(state, signal);
    } catch (e) {
      this.logger.warn(`The stale binding cleanup failed: ${getDetailedErrorMessage(e)}`);
      return state;
    }
  }

  private async schedule(taskManager: TaskManagerStartContract, interval: string): Promise<void> {
    try {
      // Updates the interval of a task scheduled before and keeps its state, so a changed interval
      // does not restart the sweep.
      await taskManager.ensureScheduled({
        id: TASK_ID,
        taskType: SERVICE_ACCOUNT_BINDING_CLEANUP_TASK_TYPE,
        scope: ['security'],
        schedule: { interval },
        params: {},
        state: EMPTY_STATE,
      });
      this.logger.debug(`Scheduled the stale binding cleanup to run every ${interval}.`);
    } catch (e) {
      this.logger.error(
        `Failed to schedule the stale binding cleanup: ${getDetailedErrorMessage(e)}`
      );
      throw e;
    }
  }
}
