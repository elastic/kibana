/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup, KibanaRequest, Plugin } from '@kbn/core/server';

export class HealthGatewayStatusPlugin implements Plugin<void, void> {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    router.get({ path: '/api/status/ok', validate: {} }, async (context, req, res) => res.ok());

    router.get({ path: '/api/status/redirect', validate: {} }, async (context, req, res) =>
      res.redirected({ headers: { location: '/api/status/ok' } })
    );

    router.get({ path: '/api/status/unauthorized', validate: {} }, async (context, req, res) =>
      res.unauthorized({
        headers: { 'www-authenticate': 'Basic' },
      })
    );

    router.get({ path: '/api/status/not-found', validate: {} }, async (context, req, res) =>
      res.notFound()
    );

    router.get({ path: '/api/status/slow', validate: {} }, async (context, req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      return res.ok();
    });

    const sessions = new Set<string>();
    router.get(
      {
        path: '/api/status/flaky',
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
