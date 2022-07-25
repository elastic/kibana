/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';

export class CoreHttpPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/core_http/never_reply',
        validate: false,
      },
      async (ctx, req, res) => {
        // need the endpoint to never reply to test request cancelation on the client side.
        await new Promise(() => undefined);
        return res.ok();
      }
    );
  }

  public start() {}

  public stop() {}
}
