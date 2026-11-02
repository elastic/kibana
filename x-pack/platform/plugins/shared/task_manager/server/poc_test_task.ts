/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam — dev-only test scaffolding.
 *
 * Gated behind TM_POC_TEST_TASK=true. Registers:
 *  - a pathological task type that synchronously blocks the main-thread event
 *    loop (the PRD "kill test"), and a noop task type for end-to-end checks
 *  - an internal route to schedule them on demand
 * Never active in normal operation.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import type { TaskTypeDictionary } from './task_type_dictionary';
import type { TaskManagerStartContract } from './plugin';

export const POC_TEST_TASK_ENV_FLAG = 'TM_POC_TEST_TASK';

/**
 * Default ON for serverless builds of this branch (QAF cannot inject env
 * vars; needed for the cloud smoke); TM_POC_TEST_TASK=false is the kill
 * switch. Default OFF everywhere else, opt in with TM_POC_TEST_TASK=true.
 */
export function isPocTestTaskEnabled(isServerless: boolean): boolean {
  const flag = process.env[POC_TEST_TASK_ENV_FLAG];
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return isServerless;
}

export const POC_BLOCKER_TASK_TYPE = 'pocEventLoopBlocker';
export const POC_NOOP_TASK_TYPE = 'pocNoop';

export function registerPocTestTaskDefinitions(
  definitions: TaskTypeDictionary,
  logger: Logger
): void {
  definitions.registerTaskDefinitions({
    [POC_BLOCKER_TASK_TYPE]: {
      title: 'PoC event loop blocker (kill test)',
      timeout: '10m',
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance }) => ({
        async run() {
          const durationMs = Number(taskInstance.params.durationMs) || 30_000;
          logger.warn(
            `[poc-kill-test] task ${
              taskInstance.id
            } BLOCKING the main-thread event loop for ${durationMs}ms starting ${new Date().toISOString()}`
          );
          const until = Date.now() + durationMs;
          // Synchronous hot spin: nothing on this event loop runs until done.
          while (Date.now() < until) {
            // spin
          }
          logger.warn(
            `[poc-kill-test] task ${
              taskInstance.id
            } finished blocking at ${new Date().toISOString()}`
          );
          return { state: {} };
        },
      }),
    },
    [POC_NOOP_TASK_TYPE]: {
      title: 'PoC noop (end-to-end / nudge check)',
      timeout: '1m',
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance }) => ({
        async run() {
          logger.info(
            `[poc-noop] task ${
              taskInstance.id
            } executed at ${new Date().toISOString()} (runAt was ${taskInstance.runAt?.toISOString()})`
          );
          return { state: {} };
        },
      }),
    },
  });
}

export function registerPocTestRoutes({
  router,
  logger,
  getStartContract,
}: {
  router: IRouter;
  logger: Logger;
  getStartContract: () => Promise<TaskManagerStartContract>;
}): void {
  router.post(
    {
      path: '/internal/task_manager/_poc/schedule',
      validate: {
        body: schema.object({
          taskType: schema.oneOf([
            schema.literal(POC_BLOCKER_TASK_TYPE),
            schema.literal(POC_NOOP_TASK_TYPE),
          ]),
          durationMs: schema.number({ defaultValue: 30_000, min: 0, max: 300_000 }),
          // When true, exercises the claim-nudge path (schedule + runSoon with
          // requestImmediateClaim) for the sub-poll-interval pickup check.
          nudge: schema.boolean({ defaultValue: false }),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'PoC dev-only scaffolding, gated behind TM_POC_TEST_TASK env flag',
        },
      },
    },
    async (_ctx, req, res) => {
      const { taskType, durationMs, nudge } = req.body;
      const contract = await getStartContract();
      const task = await contract.schedule({
        taskType,
        params: { durationMs },
        state: {},
        scope: ['poc'],
        // With nudge, schedule slightly in the future so the version-checked
        // runSoon below cannot race a regular poll cycle's claim.
        ...(nudge ? { runAt: new Date(Date.now() + 15_000) } : {}),
      });
      if (nudge) {
        // Only runSoon sends a claim nudge; plain schedule never does.
        await contract.runSoon(task.id, { requestImmediateClaim: true });
      }
      logger.info(
        `[poc] scheduled ${taskType} task ${
          task.id
        } (durationMs=${durationMs}, nudge=${nudge}) at ${new Date().toISOString()}`
      );
      return res.ok({
        body: { id: task.id, taskType: task.taskType, scheduledAt: task.scheduledAt },
      });
    }
  );
}
