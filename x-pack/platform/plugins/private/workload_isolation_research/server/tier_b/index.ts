/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreStart, ElasticsearchClient, IRouter } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import { epochNow } from '../lib/clock';
import type { Recorder } from '../lib/recorder';
import type { IsolatedTaskExecutor } from '../lib/isolated_task_executor';
import { runFieldCaps } from './field_caps';
import { seedAlertingWide, seedFieldCaps } from '../../common/seed';

export const FIELD_CAPS_TASK_TYPE = 'workloadIsolationResearch:fieldCaps';

const security = { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } };
const options = { access: 'internal' as const };

export const registerTierBTasks = (
  taskManager: TaskManagerSetupContract,
  getRecorder: () => Recorder,
  getEs: () => Promise<ElasticsearchClient>,
  isolatedExecutor: IsolatedTaskExecutor
) => {
  taskManager.registerTaskDefinitions({
    [FIELD_CAPS_TASK_TYPE]: {
      title: 'Workload isolation research: field caps replay',
      description: 'RESEARCH ONLY: repeated large field_caps via the data views fetcher.',
      timeout: '30m',
      maxAttempts: 1,
      cost: TaskCost.Normal,
      priority: TaskPriority.Standard,
      paramsSchema: schema.object({
        repeat: schema.number({ min: 1, max: 1000 }),
        decompose: schema.boolean(),
        execution: schema.maybe(schema.oneOf([schema.literal('main'), schema.literal('thread')])),
        runId: schema.maybe(schema.string({ maxLength: 256 })),
      }),
      createTaskRunner: ({ taskInstance, signal, executionUuid }) => ({
        run: async () => {
          const { repeat, decompose, runId, execution } = taskInstance.params as {
            repeat: number;
            decompose: boolean;
            runId?: string;
            execution?: 'main' | 'thread';
          };
          const ts = epochNow();
          let dispatch = 0;
          const result = await runFieldCaps(await getEs(), {
            repeat,
            decompose,
            ...(execution === 'thread'
              ? {
                  shapeOffMain: (bytes: ArrayBuffer, pattern: string) =>
                    isolatedExecutor.run(
                      'field_caps',
                      { module: 'field_caps', bytes, pattern },
                      { signal, executionId: `${executionUuid}-${dispatch++}`, killAfterMs: 60000 }
                    ),
                }
              : {}),
          });
          getRecorder().push({
            source: 'tier_b',
            ts,
            end: epochNow(),
            replay: 'field_caps',
            mode: 'task',
            execution: execution ?? 'main',
            run_id: runId,
            task_id: taskInstance.id,
            ...result,
          });
          return { state: {} };
        },
      }),
    },
  });
};

export const registerTierBRoutes = (
  router: IRouter,
  apiBase: string,
  getRecorder: () => Recorder,
  getStart: () => Promise<{ core: CoreStart; taskManager: TaskManagerStartContract }>
) => {
  router.post(
    {
      path: `${apiBase}/tier_b/seed`,
      security,
      options: { ...options, timeout: { idleSocket: 30 * 60 * 1000 } },
      validate: {
        body: schema.object({
          kind: schema.oneOf([schema.literal('field_caps'), schema.literal('alerting_wide')]),
          indices: schema.number({ defaultValue: 50, min: 1, max: 500 }),
          fieldsPerIndex: schema.number({ defaultValue: 2000, min: 1, max: 20000 }),
          conflictRatio: schema.number({ defaultValue: 0.2, min: 0, max: 1 }),
          uniqueRatio: schema.number({ defaultValue: 0, min: 0, max: 1 }),
          rows: schema.number({ defaultValue: 1000, min: 1, max: 100000 }),
          fields: schema.number({ defaultValue: 100, min: 1, max: 5000 }),
        }),
      },
    },
    async (ctx, req, res) => {
      const es = (await ctx.core).elasticsearch.client.asCurrentUser;
      const b = req.body;
      try {
        const result =
          b.kind === 'field_caps'
            ? await seedFieldCaps(es, {
                indices: b.indices,
                fieldsPerIndex: b.fieldsPerIndex,
                conflictRatio: b.conflictRatio,
                uniqueRatio: b.uniqueRatio,
              })
            : await seedAlertingWide(es, b.rows, b.fields);
        return res.ok({ body: result });
      } catch (e) {
        return res.customError({ statusCode: 500, body: { message: `seed failed: ${e.message}` } });
      }
    }
  );

  router.post(
    {
      path: `${apiBase}/tier_b/field_caps`,
      security,
      options: { ...options, timeout: { idleSocket: 30 * 60 * 1000 } },
      validate: {
        body: schema.object({
          repeat: schema.number({ defaultValue: 5, min: 1, max: 1000 }),
          decompose: schema.boolean({ defaultValue: true }),
          execution: schema.oneOf([schema.literal('main'), schema.literal('thread')], {
            defaultValue: 'main',
          }),
          mode: schema.oneOf([schema.literal('route'), schema.literal('task')], {
            defaultValue: 'route',
          }),
          runId: schema.maybe(schema.string({ maxLength: 256 })),
        }),
      },
    },
    async (ctx, req, res) => {
      const { repeat, decompose, mode, runId, execution } = req.body;
      if (execution === 'thread' && (mode !== 'task' || !decompose)) {
        return res.badRequest({
          body: { message: 'Thread execution requires task mode and decomposed streaming' },
        });
      }
      const recorder = getRecorder();
      if (mode === 'task') {
        const { taskManager } = await getStart();
        const task = await taskManager.schedule({
          taskType: FIELD_CAPS_TASK_TYPE,
          params: { repeat, decompose, runId, execution },
          state: {},
        });
        return res.ok({ body: { mode, task_id: task.id, pod: recorder.pod } });
      }
      const ts = epochNow();
      let result;
      try {
        result = await runFieldCaps((await ctx.core).elasticsearch.client.asCurrentUser, {
          repeat,
          decompose,
        });
      } catch (e) {
        return res.customError({
          statusCode: 500,
          body: { message: `field_caps failed: ${e.message}` },
        });
      }
      const sample = {
        source: 'tier_b',
        ts,
        end: epochNow(),
        replay: 'field_caps',
        mode,
        run_id: runId,
        ...result,
      };
      recorder.push(sample);
      return res.ok({ body: { ...sample, pod: recorder.pod } });
    }
  );
};
