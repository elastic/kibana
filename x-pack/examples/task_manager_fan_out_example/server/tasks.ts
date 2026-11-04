/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { getYieldTaskRunResult, throwRetryableError } from '@kbn/task-manager-plugin/server';

export const PARENT_TASK_TYPE = 'fanOutExample:parent';
export const CHILD_TASK_TYPE = 'fanOutExample:child';

/** Children spawned by the parent. `failTimes` throws on that many runs before succeeding. */
const CHILDREN = [
  { key: 'fast', delayMs: 3_000, failTimes: 0 },
  { key: 'medium', delayMs: 15_000, failTimes: 0 },
  { key: 'slow', delayMs: 45_000, failTimes: 0 },
  { key: 'flaky', delayMs: 5_000, failTimes: 3 },
];

const CHILD_RETRY_DELAY_MS = 10_000;
/** How long the finished parent keeps its children around so they can be looked at. */
const HOLD_RESULTS_FOR = '2m';
/** Safety net: the parent re-reads its children at least this often while waiting. */
const JOIN_DEADLINE = '5m';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ParentState {
  phase?: 'spawn' | 'join' | 'hold';
  keys?: string[];
  wakes?: number;
  results?: Array<{ key: string; outcome: string; attempts?: number; result?: unknown }>;
}

interface ChildParams {
  delayMs: number;
  failTimes: number;
}

export const registerFanOutExampleTasks = (
  taskManager: TaskManagerSetupContract,
  logger: Logger
) => {
  taskManager.registerTaskDefinitions({
    [PARENT_TASK_TYPE]: {
      title: 'Fan-out example: parent',
      description:
        'Spawns four sub-tasks, yields until they all end, joins their results, and holds them for a while.',
      timeout: '2m',
      createTaskRunner: ({ taskInstance, fanOut }: RunContext) => ({
        async run() {
          if (!fanOut) {
            throw new Error('fanOut is not available in this run context');
          }
          const state = taskInstance.state as ParentState;
          const phase = state.phase ?? 'spawn';
          const log = (message: string) => logger.info(`[${taskInstance.id}] ${message}`);

          if (phase === 'spawn') {
            const keys = CHILDREN.map(({ key }) => key);
            await fanOut.spawn(
              CHILDREN.map(({ key, delayMs, failTimes }) => ({
                key,
                taskType: CHILD_TASK_TYPE,
                params: { delayMs, failTimes },
              }))
            );
            log(`spawned ${keys.length} sub-tasks (${keys.join(', ')}); waiting`);
            return getYieldTaskRunResult({
              state: { phase: 'join', keys, wakes: 0 } satisfies ParentState,
              delay: JOIN_DEADLINE,
            });
          }

          if (phase === 'join') {
            const keys = state.keys ?? [];
            const wakes = (state.wakes ?? 0) + 1;
            const summary = await fanOut.summarize(keys);
            log(
              `woke up (#${wakes}): ${summary.done} done, ${summary.failed} failed, ${summary.inProgress} in progress`
            );

            if (!summary.settled) {
              return getYieldTaskRunResult({
                state: { ...state, wakes } satisfies ParentState,
                delay: JOIN_DEADLINE,
              });
            }

            const results = summary.children.map(
              ({ key, outcome, attempts, state: childState }) => ({
                key,
                outcome,
                attempts,
                result: childState?.result,
              })
            );
            log(
              `all sub-tasks settled: ${JSON.stringify(results)}; holding for ${HOLD_RESULTS_FOR}`
            );
            return getYieldTaskRunResult({
              state: { phase: 'hold', keys, wakes, results } satisfies ParentState,
              delay: HOLD_RESULTS_FOR,
            });
          }

          // hold: the results were kept visible for a while; remove the children and finish.
          await fanOut.cleanup();
          log('cleaned up sub-tasks; done');
          return { state: {} };
        },
      }),
    },

    [CHILD_TASK_TYPE]: {
      title: 'Fan-out example: child',
      description: 'Waits for `delayMs`, failing the first `failTimes` runs, then returns its key.',
      maxAttempts: 5,
      timeout: '2m',
      createTaskRunner: ({ taskInstance }: RunContext) => {
        let cancelled = false;
        return {
          async run() {
            const { delayMs, failTimes } = taskInstance.params as ChildParams;
            const { attempts, childKey } = taskInstance;
            logger.info(`[${taskInstance.id}] run #${attempts}, sleeping ${delayMs}ms`);
            await sleep(delayMs);
            if (cancelled) {
              return { state: {} };
            }
            if (attempts <= failTimes) {
              logger.info(`[${taskInstance.id}] failing on purpose (${attempts}/${failTimes})`);
              throwRetryableError(
                new Error(`${childKey} failed on purpose, attempt ${attempts} of ${failTimes}`),
                new Date(Date.now() + CHILD_RETRY_DELAY_MS)
              );
            }
            return { state: { result: `${childKey} finished after ${attempts} attempt(s)` } };
          },
          async cancel() {
            cancelled = true;
          },
        };
      },
    },
  });
};
