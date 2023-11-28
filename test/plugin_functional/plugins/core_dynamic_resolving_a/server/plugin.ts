/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';

interface GenericSetupContract {
  someSetupAPI: () => string;
}

interface GenericStartContract {
  someStartAPI: () => string;
}

export class CoreDynamicResolvingAPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/core_dynamic_resolving_a/test',
        validate: false,
      },
      async (ctx, req, res) => {
        return Promise.all([
          core.plugins.onSetup<{
            coreDynamicResolvingB: GenericSetupContract;
          }>('coreDynamicResolvingB'),
          core.plugins.onStart<{
            coreDynamicResolvingB: GenericStartContract;
          }>('coreDynamicResolvingB'),
        ]).then(
          ([
            { coreDynamicResolvingB: coreDynamicResolvingBSetup },
            { coreDynamicResolvingB: coreDynamicResolvingBStart },
          ]) => {
            if (coreDynamicResolvingBSetup.found && coreDynamicResolvingBStart.found) {
              return res.ok({
                body: {
                  setup: coreDynamicResolvingBSetup.contract.someSetupAPI(),
                  start: coreDynamicResolvingBStart.contract.someStartAPI(),
                },
              });
            } else {
              return res.badRequest({
                body: {
                  message: 'not found',
                },
              });
            }
          }
        );
      }
    );

    return {
      someSetupAPI: () => 'pluginASetup',
    };
  }

  public start() {
    return {
      someStartAPI: () => 'pluginAStart',
    };
  }

  public stop() {}
}
