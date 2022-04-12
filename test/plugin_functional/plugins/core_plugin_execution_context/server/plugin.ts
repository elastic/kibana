/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreSetup } from 'kibana/server';

export class CorePluginExecutionContext implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/execution_context/pass',
        validate: false,
        options: {
          authRequired: false,
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client;
        const { headers } = await esClient.asCurrentUser.ping({}, { meta: true });
        return response.ok({ body: headers || {} });
      }
    );
  }

  public start() {}

  public stop() {}
}
