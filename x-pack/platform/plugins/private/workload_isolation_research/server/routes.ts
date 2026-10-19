/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreStart, IRouter, Logger } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { epochNow } from './lib/clock';
import type { OffenderKind } from './lib/offenders';
import { OFFENDER_KINDS, runOffender } from './lib/offenders';
import type { Recorder } from './lib/recorder';
import { OFFENDER_TASK_TYPE } from './tasks';
import type { TickScheduler } from './tasks';

export const API_BASE = '/internal/workload_isolation_research';

const security = { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } };
const options = { access: 'internal' as const };

export interface RouteDeps {
  router: IRouter;
  logger: Logger;
  getRecorder: () => Recorder;
  getStart: () => Promise<{
    core: CoreStart;
    taskManager: TaskManagerStartContract;
    ticks: TickScheduler;
  }>;
  getInfo: () => Record<string, unknown>;
}

export const registerRoutes = ({ router, getRecorder, getStart, getInfo }: RouteDeps): void => {
  router.get(
    { path: `${API_BASE}/info`, security, options, validate: false },
    async (_ctx, _req, res) => res.ok({ body: getInfo() })
  );

  router.post(
    {
      path: `${API_BASE}/samples`,
      security,
      options,
      validate: {
        body: schema.object({
          cursors: schema.recordOf(
            schema.string({ maxLength: 64 }),
            schema.object({ main: schema.number(), worker: schema.number() })
          ),
          limit: schema.number({ defaultValue: 20000, min: 1, max: 100000 }),
        }),
      },
    },
    async (_ctx, req, res) => {
      const recorder = getRecorder();
      const cursor = req.body.cursors[recorder.bootId] ?? { main: 0, worker: 0 };
      return res.ok({ body: await recorder.samples(cursor.main, cursor.worker, req.body.limit) });
    }
  );

  router.post(
    {
      path: `${API_BASE}/probe/_start`,
      security,
      options,
      validate: {
        body: schema.object({
          path: schema.string({ defaultValue: '/api/spaces/space', maxLength: 1024 }),
          rps: schema.number({ defaultValue: 10, min: 0.1, max: 200 }),
          timeoutMs: schema.number({ defaultValue: 60000, min: 100, max: 600000 }),
          maxInFlight: schema.number({ defaultValue: 2000, min: 1, max: 10000 }),
          runId: schema.maybe(schema.string({ maxLength: 256 })),
          /** Override target origin (default: this process' own listener over loopback). */
          origin: schema.maybe(schema.string({ maxLength: 1024 })),
        }),
      },
    },
    async (_ctx, req, res) => {
      const { core } = await getStart();
      const info = core.http.getServerInfo();
      const host = ['0.0.0.0', '::', ''].includes(info.hostname) ? '127.0.0.1' : info.hostname;
      const origin = req.body.origin ?? `${info.protocol}://${host}:${info.port}`;
      const url = `${origin}${core.http.basePath.serverBasePath}${req.body.path}`;
      // The caller's credentials are reused for the in-pod probe; kept in memory only.
      const headers: Record<string, string> = {
        'x-elastic-internal-origin': 'kibana-research-probe',
      };
      const auth = req.headers.authorization;
      if (typeof auth === 'string') headers.authorization = auth;
      await getRecorder().startProbe({
        url,
        headers,
        rps: req.body.rps,
        timeoutMs: req.body.timeoutMs,
        maxInFlight: req.body.maxInFlight,
        insecure: info.protocol === 'https',
        runId: req.body.runId,
      });
      return res.ok({
        body: { pod: getRecorder().pod, boot_id: getRecorder().bootId, url, has_auth: !!auth },
      });
    }
  );

  router.get(
    { path: `${API_BASE}/edges`, security, options, validate: false },
    async (_ctx, _req, res) => {
      const tracer = (
        globalThis as unknown as Record<
          string,
          { snapshot(): unknown[]; wrapErrors: number } | undefined
        >
      ).__kbnResearchContractTracer;
      return res.ok({
        body: {
          enabled: !!tracer,
          wrap_errors: tracer?.wrapErrors ?? 0,
          edges: tracer?.snapshot() ?? [],
        },
      });
    }
  );

  router.post(
    { path: `${API_BASE}/edges/_reset`, security, options, validate: false },
    async (_ctx, _req, res) => {
      const tracer = (globalThis as unknown as Record<string, { reset(): void } | undefined>)
        .__kbnResearchContractTracer;
      tracer?.reset();
      return res.ok({ body: { enabled: !!tracer } });
    }
  );

  router.post(
    { path: `${API_BASE}/probe/_stop`, security, options, validate: false },
    async (_ctx, _req, res) => {
      await getRecorder().stopProbe();
      return res.ok({ body: { pod: getRecorder().pod, boot_id: getRecorder().bootId } });
    }
  );

  router.post(
    {
      path: `${API_BASE}/supervise`,
      security,
      options,
      validate: {
        body: schema.object({
          killAfterMs: schema.number({ min: 0, max: 3_600_000 }),
          signal: schema.oneOf([schema.literal('SIGKILL'), schema.literal('SIGTERM')], {
            defaultValue: 'SIGKILL',
          }),
        }),
      },
    },
    async (_ctx, req, res) => {
      await getRecorder().supervise(req.body.killAfterMs, req.body.signal);
      return res.ok({ body: { pod: getRecorder().pod, boot_id: getRecorder().bootId } });
    }
  );

  router.post(
    {
      path: `${API_BASE}/ticks/_start`,
      security,
      options,
      validate: {
        body: schema.object({
          intervalMs: schema.number({ defaultValue: 1000, min: 100, max: 60000 }),
          durationS: schema.number({ min: 1, max: 24 * 3600 }),
          seriesId: schema.string({ maxLength: 128 }),
        }),
      },
    },
    async (_ctx, req, res) => {
      const { ticks } = await getStart();
      ticks.start(req.body);
      return res.ok({ body: { pod: getRecorder().pod, boot_id: getRecorder().bootId } });
    }
  );

  router.post(
    { path: `${API_BASE}/ticks/_stop`, security, options, validate: false },
    async (_ctx, _req, res) => {
      const { ticks } = await getStart();
      ticks.stop();
      return res.ok({ body: {} });
    }
  );

  router.post(
    {
      path: `${API_BASE}/offender`,
      security,
      options,
      validate: {
        body: schema.object({
          kind: schema.oneOf(
            OFFENDER_KINDS.map((k) => schema.literal(k)) as [ReturnType<typeof schema.literal>]
          ),
          doseMs: schema.number({ min: 0, max: 3_600_000 }),
          sizeMb: schema.maybe(schema.number({ min: 0.01, max: 512 })),
          mode: schema.oneOf([schema.literal('route'), schema.literal('task')], {
            defaultValue: 'route',
          }),
          runId: schema.maybe(schema.string({ maxLength: 256 })),
        }),
      },
    },
    async (_ctx, req, res) => {
      const recorder = getRecorder();
      const { kind, doseMs, sizeMb, mode, runId } = req.body as {
        kind: OffenderKind;
        doseMs: number;
        sizeMb?: number;
        mode: 'route' | 'task';
        runId?: string;
      };
      if (mode === 'task') {
        const { taskManager } = await getStart();
        const scheduledAt = epochNow();
        const task = await taskManager.schedule({
          taskType: OFFENDER_TASK_TYPE,
          params: { kind, doseMs, sizeMb, runId, scheduledAt },
          state: {},
        });
        return res.ok({
          body: {
            mode,
            task_id: task.id,
            scheduled_at: scheduledAt,
            pod: recorder.pod,
            boot_id: recorder.bootId,
          },
        });
      }
      const startTs = epochNow();
      recorder.push({
        source: 'offender_start',
        ts: startTs,
        mode,
        kind,
        dose_ms: doseMs,
        run_id: runId,
      });
      const result = await runOffender({ kind, doseMs, sizeMb });
      const sample = {
        source: 'offender',
        ts: startTs,
        end: epochNow(),
        mode,
        run_id: runId,
        kind: result.kind,
        dose_ms: result.doseMs,
        blocked_ms: result.blockedMs,
        prep_ms: result.prepMs,
        detail: result.detail,
      };
      recorder.push(sample);
      return res.ok({ body: { ...sample, pod: recorder.pod, boot_id: recorder.bootId } });
    }
  );
};
