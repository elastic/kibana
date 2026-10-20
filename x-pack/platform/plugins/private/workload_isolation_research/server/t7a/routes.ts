/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). Control routes for the alerting class pool (superuser, internal). */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { T7aController } from './main_host';

export const registerT7aRoutes = (
  router: IRouter,
  base: string,
  getController: () => Promise<T7aController | undefined>
): void => {
  const security = { authz: { requiredPrivileges: ['superuser'] } } as const;
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
          ]),
        }),
      },
    },
    withController((c, body: { kind: 'stats' | 'gc' | 'boot' | 'coldstart' }) =>
      c.probe(body.kind)
    ) as never
  );
  router.post(
    { path: `${base}/t7a/host/_stop`, security, options, validate: false },
    withController((c) => c.stopHost()) as never
  );
};
