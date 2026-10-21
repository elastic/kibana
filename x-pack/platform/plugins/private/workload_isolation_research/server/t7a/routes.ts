/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). Control routes for the alerting class pool (superuser, internal). */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { T7aController } from './main_host';
import {
  CHILD_CAP_MAX,
  CHILD_CAP_MIN,
  buildRuntimeDoc,
  bumpSampleRequest,
  readCgroupSamples,
  readRuntimeDoc,
  writeRuntimeDoc,
} from './runtime';

export const registerT7aRoutes = (
  router: IRouter,
  base: string,
  getController: () => Promise<T7aController | undefined>,
  getEs: () => Promise<ElasticsearchClient>
): void => {
  const security = { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } };
  const options = { access: 'internal' } as const;
  const withController =
    <T>(fn: (c: T7aController, body: T) => Promise<unknown> | unknown) =>
    async (
      _ctx: unknown,
      request: { body: T },
      response: {
        ok: (o: { body: unknown }) => unknown;
        notFound: () => unknown;
        customError: (o: { statusCode: number; body: { message: string } }) => unknown;
      }
    ) => {
      const controller = await getController();
      if (!controller) return response.notFound();
      try {
        return response.ok({ body: ((await fn(controller, request.body)) ?? {}) as object });
      } catch (error) {
        const e = error as Error;
        return response.customError({
          statusCode: 500,
          body: { message: `${e.message}\n${e.stack ?? ''}`.slice(0, 4000) },
        });
      }
    };

  router.post(
    {
      path: `${base}/t7a/config`,
      security,
      options,
      validate: {
        body: schema.object({
          mode: schema.maybe(schema.oneOf([schema.literal('main'), schema.literal('offmain')])),
          transport: schema.maybe(
            schema.oneOf([schema.literal('thread'), schema.literal('process')])
          ),
          slots: schema.maybe(schema.number({ min: 1, max: 16 })),
          concurrency: schema.maybe(schema.number({ min: 1, max: 1000 })),
          abortGraceMs: schema.maybe(schema.number({ min: 0, max: 30000 })),
          deadlineMs: schema.maybe(schema.number({ min: 1000, max: 3600000 })),
          localSo: schema.maybe(schema.boolean()),
        }),
      },
    },
    withController((c, body: object) => c.configure(body)) as never
  );
  router.get(
    { path: `${base}/t7a/stats`, security, options, validate: false },
    withController((c) => c.stats()) as never
  );
  router.post(
    { path: `${base}/t7a/stats/_reset`, security, options, validate: false },
    withController((c) => c.resetStats()) as never
  );
  router.post(
    {
      path: `${base}/t7a/probe`,
      security,
      options,
      validate: {
        body: schema.object({
          kind: schema.oneOf([
            schema.literal('stats'),
            schema.literal('gc'),
            schema.literal('boot'),
            schema.literal('coldstart'),
            schema.literal('platform'),
            schema.literal('platform-watch'),
            schema.literal('phases'),
          ]),
        }),
      },
    },
    withController(
      (
        c,
        body: {
          kind: 'stats' | 'gc' | 'boot' | 'coldstart' | 'platform' | 'platform-watch' | 'phases';
        }
      ) => c.probe(body.kind)
    ) as never
  );
  router.post(
    { path: `${base}/t7a/host/_stop`, security, options, validate: false },
    withController((c) => c.stopHost()) as never
  );

  const runtimeError = (error: unknown) => ({
    statusCode: 500 as const,
    body: {
      message: error instanceof Error ? error.name : 'research runtime failed',
    },
  });

  router.post(
    {
      path: `${base}/t7a/runtime`,
      security,
      options,
      validate: {
        body: schema.object({
          mode: schema.oneOf([
            schema.literal('main'),
            schema.literal('offmain-process'),
            schema.literal('offmain-thread'),
          ]),
          childCapMb: schema.maybe(schema.number({ min: CHILD_CAP_MIN, max: CHILD_CAP_MAX })),
          localSo: schema.maybe(schema.boolean()),
          bootArm: schema.maybe(
            schema.oneOf([schema.literal('baseline'), schema.literal('class')])
          ),
          warm: schema.maybe(schema.boolean()),
          slots: schema.maybe(schema.number({ min: 1, max: 2 })),
        }),
      },
    },
    (async (
      _ctx: unknown,
      request: {
        body: {
          mode: 'main' | 'offmain-process' | 'offmain-thread';
          childCapMb?: number;
          localSo?: boolean;
          bootArm?: 'baseline' | 'class';
          warm?: boolean;
          slots?: number;
        };
      },
      response: {
        ok: (o: { body: unknown }) => unknown;
        customError: (o: { statusCode: number; body: { message: string } }) => unknown;
      }
    ) => {
      try {
        const es = await getEs();
        const doc = buildRuntimeDoc(await readRuntimeDoc(es), request.body);
        await writeRuntimeDoc(es, doc);
        return response.ok({ body: doc });
      } catch (error) {
        return response.customError(runtimeError(error));
      }
    }) as never
  );

  router.get({ path: `${base}/t7a/runtime`, security, options, validate: false }, (async (
    _ctx: unknown,
    _request: unknown,
    response: {
      ok: (o: { body: unknown }) => unknown;
      customError: (o: { statusCode: number; body: { message: string } }) => unknown;
    }
  ) => {
    try {
      const doc = await readRuntimeDoc(await getEs());
      return response.ok({
        body: doc ?? {
          generation: 0,
          mode: 'main',
          childCapMb: 384,
          localSo: true,
          sampleRequest: 0,
          bootArm: 'baseline',
          warm: false,
          slots: 1,
        },
      });
    } catch (error) {
      return response.customError(runtimeError(error));
    }
  }) as never);

  router.post({ path: `${base}/t7a/runtime/_sample`, security, options, validate: false }, (async (
    _ctx: unknown,
    _request: unknown,
    response: {
      ok: (o: { body: unknown }) => unknown;
      customError: (o: { statusCode: number; body: { message: string } }) => unknown;
    }
  ) => {
    try {
      const es = await getEs();
      const doc = bumpSampleRequest(await readRuntimeDoc(es));
      await writeRuntimeDoc(es, doc);
      return response.ok({ body: doc });
    } catch (error) {
      return response.customError(runtimeError(error));
    }
  }) as never);

  router.get(
    {
      path: `${base}/t7a/cgroup`,
      security,
      options,
      validate: {
        query: schema.object({
          size: schema.maybe(schema.number({ min: 1, max: 100 })),
        }),
      },
    },
    (async (
      _ctx: unknown,
      request: { query: { size?: number } },
      response: {
        ok: (o: { body: unknown }) => unknown;
        customError: (o: { statusCode: number; body: { message: string } }) => unknown;
      }
    ) => {
      try {
        const samples = await readCgroupSamples(await getEs(), request.query.size ?? 20);
        return response.ok({ body: { samples } });
      } catch (error) {
        return response.customError(runtimeError(error));
      }
    }) as never
  );
};
