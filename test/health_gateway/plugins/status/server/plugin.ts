/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup, KibanaRequest, Plugin } from '@kbn/core/server';

export class HealthGatewayStatusPlugin implements Plugin<void, void> {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    router.get({ path: '/health/ok/api/status', validate: {} }, async (context, req, res) =>
      res.ok()
    );

    router.get({ path: '/health/redirect/api/status', validate: {} }, async (context, req, res) =>
      res.redirected({ headers: { location: '/health/ok/api/status' } })
    );

    router.get(
      { path: '/health/unauthorized/api/status', validate: {} },
      async (context, req, res) =>
        res.unauthorized({
          headers: { 'www-authenticate': 'Basic' },
        })
    );

    router.get({ path: '/health/not-found/api/status', validate: {} }, async (context, req, res) =>
      res.notFound()
    );

    router.get({ path: '/health/slow/api/status', validate: {} }, async (context, req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      return res.ok();
    });

    const sessions = new Set<string>();
    router.get(
      {
        path: '/health/flaky/api/status',
        validate: {
          query: schema.object({ session: schema.string() }),
        },
      },
      async (context, req: KibanaRequest<void, { session: string }>, res) => {
        if (sessions.has(req.query.session)) {
          sessions.delete(req.query.session);

          return res.custom({ statusCode: 500, body: 'Flaky' });
        }

        sessions.add(req.query.session);

        return res.ok();
      }
    );
  }

  public start() {}

  public stop() {}
}
