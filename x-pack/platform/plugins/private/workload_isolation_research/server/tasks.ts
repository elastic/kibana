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
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import { epochNow } from './lib/clock';
import type { OffenderKind } from './lib/offenders';
import { OFFENDER_KINDS, runOffender } from './lib/offenders';
import type { Recorder } from './lib/recorder';

export const OFFENDER_TASK_TYPE = 'workloadIsolationResearch:offender';
export const TICK_TASK_TYPE = 'workloadIsolationResearch:tick';

const offenderParamsSchema = schema.object({
  kind: schema.oneOf(OFFENDER_KINDS.map((k) => schema.literal(k)) as [ReturnType<typeof schema.literal>]),
  doseMs: schema.number({ min: 0, max: 3_600_000 }),
  sizeMb: schema.maybe(schema.number({ min: 0.01, max: 512 })),
  runId: schema.maybe(schema.string({ maxLength: 256 })),
  scheduledAt: schema.number(),
});

const tickParamsSchema = schema.object({
  intendedRunAt: schema.number(),
  seriesId: schema.string({ maxLength: 256 }),
  index: schema.number(),
});

export const registerResearchTasks = (
  taskManager: TaskManagerSetupContract,
  getRecorder: () => Recorder
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
      createTaskRunner: ({ taskInstance }) => ({
        run: async () => {
          const params = taskInstance.params as {
            kind: OffenderKind;
            doseMs: number;
            sizeMb?: number;
            runId?: string;
            scheduledAt: number;
          };
          const recorder = getRecorder();
          const startTs = epochNow();
          recorder.push({ source: 'offender_start', ts: startTs, mode: 'task', task_id: taskInstance.id, ...params });
          const result = await runOffender(params);
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
          });
          return { state: {} };
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

  constructor(
    private readonly taskManager: TaskManagerStartContract,
    private readonly logger: Logger,
    private readonly recorder: Recorder
  ) {}

  public start({ intervalMs, durationS, seriesId, aheadMs = 30000 }: { intervalMs: number; durationS: number; seriesId: string; aheadMs?: number }): void {
    this.stop();
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
        try {
          // NB: bulkSchedule() overwrites caller-supplied runAt with now (+jitter), so ticks
          // are scheduled individually to keep their intended runAt.
          await Promise.all(tasks.map((task) => this.taskManager.schedule(task)));
          this.recorder.push({ source: 'tick_scheduled', ts: Date.now(), count: tasks.length, series_id: seriesId });
        } catch (e) {
          this.logger.warn(`tick scheduling failed: ${e.message}`);
        }
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
}
