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
import { runFieldCaps, seedFieldCaps } from './field_caps';

export const FIELD_CAPS_TASK_TYPE = 'workloadIsolationResearch:fieldCaps';
export const ALERTING_WIDE_INDEX = 'wir-alerting-wide';

const security = { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } };
const options = { access: 'internal' as const };

const seedAlertingWide = async (es: ElasticsearchClient, rows: number, fields: number) => {
  await es.indices.delete({ index: ALERTING_WIDE_INDEX, ignore_unavailable: true });
  await es.indices.create({
    index: ALERTING_WIDE_INDEX,
    settings: { 'index.mapping.total_fields.limit': fields + 1000, number_of_shards: 1 },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        'host.name': { type: 'keyword' },
        ...Object.fromEntries(
          Array.from({ length: fields }, (_, f) => [`attr_${f}`, { type: 'keyword' }])
        ),
      },
    },
  });
  const now = new Date().toISOString();
  for (let start = 0; start < rows; start += 500) {
    const operations: Array<Record<string, unknown>> = [];
    for (let r = start; r < Math.min(rows, start + 500); r++) {
      const doc: Record<string, unknown> = { '@timestamp': now, 'host.name': `host-${r}` };
      for (let f = 0; f < fields; f++)
        doc[`attr_${f}`] = `value-${r}-${f}-lorem-ipsum-dolor-sit-amet`;
      operations.push({ index: { _index: ALERTING_WIDE_INDEX } }, doc);
    }
    await es.bulk({ operations, refresh: false });
  }
  await es.indices.refresh({ index: ALERTING_WIDE_INDEX });
  return { rows, fields };
};

export const registerTierBTasks = (
  taskManager: TaskManagerSetupContract,
  getRecorder: () => Recorder,
  getEs: () => Promise<ElasticsearchClient>
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
        runId: schema.maybe(schema.string({ maxLength: 256 })),
      }),
      createTaskRunner: ({ taskInstance }) => ({
        run: async () => {
          const { repeat, decompose, runId } = taskInstance.params as {
            repeat: number;
            decompose: boolean;
            runId?: string;
          };
          const ts = epochNow();
          const result = await runFieldCaps(await getEs(), { repeat, decompose });
          getRecorder().push({
            source: 'tier_b',
            ts,
            end: epochNow(),
            replay: 'field_caps',
            mode: 'task',
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
          mode: schema.oneOf([schema.literal('route'), schema.literal('task')], {
            defaultValue: 'route',
          }),
          runId: schema.maybe(schema.string({ maxLength: 256 })),
        }),
      },
    },
    async (ctx, req, res) => {
      const { repeat, decompose, mode, runId } = req.body;
      const recorder = getRecorder();
      if (mode === 'task') {
        const { taskManager } = await getStart();
        const task = await taskManager.schedule({
          taskType: FIELD_CAPS_TASK_TYPE,
          params: { repeat, decompose, runId },
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
