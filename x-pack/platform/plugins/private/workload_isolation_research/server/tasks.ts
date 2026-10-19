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
import { TaskCost, TaskPriority, throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { epochNow } from './lib/clock';
import type { OffenderKind } from './lib/offenders';
import { OFFENDER_KINDS, runOffender } from './lib/offenders';
import type { Recorder } from './lib/recorder';
import type { IsolatedTaskExecutor } from './lib/isolated_task_executor';
import { IsolatedTaskTerminatedError } from './lib/isolated_task_terminated_error';

export const OFFENDER_TASK_TYPE = 'workloadIsolationResearch:offender';
export const TICK_TASK_TYPE = 'workloadIsolationResearch:tick';

const offenderParamsSchema = schema.object({
  kind: schema.oneOf(
    OFFENDER_KINDS.map((k) => schema.literal(k)) as [ReturnType<typeof schema.literal>]
  ),
  doseMs: schema.number({ min: 0, max: 3_600_000 }),
  sizeMb: schema.maybe(schema.number({ min: 0.01, max: 512 })),
  runId: schema.maybe(schema.string({ maxLength: 256 })),
  scheduledAt: schema.number(),
  execution: schema.maybe(schema.oneOf([schema.literal('main'), schema.literal('thread')])),
  killAfterMs: schema.maybe(schema.number({ min: 10, max: 600000 })),
});

const tickParamsSchema = schema.object({
  intendedRunAt: schema.number(),
  seriesId: schema.string({ maxLength: 256 }),
  index: schema.number(),
});

export const registerResearchTasks = (
  taskManager: TaskManagerSetupContract,
  getRecorder: () => Recorder,
  isolatedExecutor: IsolatedTaskExecutor
): void => {
  taskManager.registerTaskDefinitions({
    [OFFENDER_TASK_TYPE]: {
      title: 'Workload isolation research: synthetic offender',
      description: 'RESEARCH ONLY: runs a synthetic event-loop offender as a background task.',
      timeout: '60m',
      maxAttempts: 1,
      cost: TaskCost.Normal,
      priority: TaskPriority.Standard,
      paramsSchema: offenderParamsSchema,
      createTaskRunner: ({ taskInstance, signal, executionUuid }) => ({
        run: async () => {
          const params = taskInstance.params as {
            kind: OffenderKind;
            doseMs: number;
            sizeMb?: number;
            runId?: string;
            scheduledAt: number;
            execution?: 'main' | 'thread';
            killAfterMs?: number;
          };
          const recorder = getRecorder();
          const startTs = epochNow();
          recorder.push({
            source: 'offender_start',
            ts: startTs,
            mode: 'task',
            task_id: taskInstance.id,
            ...params,
          });
          try {
            const { result, threadId, heapUsed } =
              params.execution === 'thread'
                ? await isolatedExecutor.run(
                    'offender',
                    { module: 'offender', params },
                    { signal, executionId: executionUuid, killAfterMs: params.killAfterMs }
                  )
                : {
                    result: await runOffender(params),
                    threadId: 0,
                    heapUsed: process.memoryUsage().heapUsed,
                  };
            recorder.push({
              source: 'offender',
              ts: startTs,
              end: epochNow(),
              mode: 'task',
              task_id: taskInstance.id,
              run_id: params.runId,
              scheduled_at: params.scheduledAt,
              kind: result.kind,
              dose_ms: result.doseMs,
              blocked_ms: result.blockedMs,
              prep_ms: result.prepMs,
              detail: result.detail,
              execution: params.execution ?? 'main',
              worker_thread_id: threadId,
              executor_heap_used: heapUsed,
              outcome: 'success',
            });
            return { state: {} };
          } catch (error) {
            recorder.push({
              source: 'offender_terminal',
              ts: startTs,
              end: epochNow(),
              mode: 'task',
              task_id: taskInstance.id,
              run_id: params.runId,
              execution: params.execution ?? 'main',
              outcome: error instanceof IsolatedTaskTerminatedError ? 'terminated' : 'failed',
              reason: error instanceof Error ? error.message : String(error),
              discarded_runs:
                error instanceof IsolatedTaskTerminatedError ? error.discardedRuns.length : 0,
              collateral: error instanceof IsolatedTaskTerminatedError ? error.collateral : false,
            });
            throwUnrecoverableError(error instanceof Error ? error : new Error(String(error)));
          }
        },
      }),
    },
    [TICK_TASK_TYPE]: {
      title: 'Workload isolation research: tick',
      description: 'RESEARCH ONLY: tiny neighbour task recording its start drift.',
      timeout: '1m',
      maxAttempts: 1,
      cost: TaskCost.Tiny,
      priority: TaskPriority.Standard,
      paramsSchema: tickParamsSchema,
      createTaskRunner: ({ taskInstance }) => ({
        run: async () => {
          const startedAt = epochNow();
          const { intendedRunAt, seriesId, index } = taskInstance.params as {
            intendedRunAt: number;
            seriesId: string;
            index: number;
          };
          getRecorder().push({
            source: 'tick',
            ts: intendedRunAt,
            started_at: startedAt,
            drift_ms: startedAt - intendedRunAt,
            series_id: seriesId,
            index,
            task_id: taskInstance.id,
          });
          return { state: {} };
        },
      }),
    },
  });
};

/** Pre-schedules one-shot tick tasks ahead of time so scheduling itself never depends on a blocked main thread. */
export class TickScheduler {
  private timer?: NodeJS.Timeout;
  private nextIndex = 0;
  private scheduledUntil = 0;
  private scheduled: Array<{ id: string; runAt: number }> = [];

  constructor(
    private readonly taskManager: TaskManagerStartContract,
    private readonly logger: Logger,
    private readonly recorder: Recorder
  ) {}

  public start({
    intervalMs,
    durationS,
    seriesId,
    aheadMs = 30000,
  }: {
    intervalMs: number;
    durationS: number;
    seriesId: string;
    aheadMs?: number;
  }): void {
    this.stop();
    this.scheduled = [];
    const t0 = Math.ceil((Date.now() + 2000) / intervalMs) * intervalMs;
    const endAt = t0 + durationS * 1000;
    this.nextIndex = 0;
    this.scheduledUntil = t0;
    const scheduleWindow = async () => {
      const until = Math.min(endAt, Date.now() + aheadMs);
      const tasks = [];
      while (this.scheduledUntil < until) {
        const runAt = this.scheduledUntil;
        tasks.push({
          id: `wir-tick-${seriesId}-${this.nextIndex}`,
          taskType: TICK_TASK_TYPE,
          runAt: new Date(runAt),
          params: { intendedRunAt: runAt, seriesId, index: this.nextIndex },
          state: {},
        });
        this.nextIndex++;
        this.scheduledUntil += intervalMs;
      }
      if (tasks.length) {
        // NB: bulkSchedule() overwrites caller-supplied runAt with now (+jitter), so ticks
        // are scheduled individually to keep their intended runAt.
        const results = await Promise.allSettled(
          tasks.map((task) => this.taskManager.schedule(task))
        );
        const ok = tasks.filter((_, i) => results[i].status === 'fulfilled');
        for (const task of ok) this.scheduled.push({ id: task.id, runAt: task.runAt.getTime() });
        // Scheduled tick ids/runAts are the denominator for tick coverage in scorecards.
        this.recorder.push({
          source: 'tick_scheduled',
          ts: Date.now(),
          count: ok.length,
          failed: tasks.length - ok.length,
          series_id: seriesId,
          ids: ok.map((task) => task.id),
          run_ats: ok.map((task) => task.runAt.getTime()),
        });
        if (ok.length < tasks.length)
          this.logger.warn(`tick scheduling failed for ${tasks.length - ok.length} ticks`);
      }
      if (this.scheduledUntil >= endAt) this.stop();
    };
    void scheduleWindow();
    this.timer = setInterval(scheduleWindow, Math.max(1000, aheadMs / 2));
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Stops scheduling and removes this series' ticks that are still in the future. */
  public async stopAndRemoveFuture(): Promise<{ removed: number }> {
    this.stop();
    const future = this.scheduled.filter((s) => s.runAt > Date.now() + 2000).map((s) => s.id);
    this.scheduled = this.scheduled.filter((s) => !future.includes(s.id));
    if (future.length) await this.taskManager.bulkRemove(future).catch(() => undefined);
    return { removed: future.length };
  }
}
