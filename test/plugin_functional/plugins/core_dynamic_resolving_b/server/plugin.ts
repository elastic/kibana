/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';

interface GenericSetupContract {
  someSetupAPI: () => string;
}

interface GenericStartContract {
  someStartAPI: () => string;
}

export class CoreDynamicResolvingBPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/core_dynamic_resolving_b/test',
        validate: false,
      },
      async (ctx, req, res) => {
        return Promise.all([
          core.plugins.onSetup<{
            coreDynamicResolvingA: GenericSetupContract;
          }>('coreDynamicResolvingA'),
          core.plugins.onStart<{
            coreDynamicResolvingA: GenericStartContract;
          }>('coreDynamicResolvingA'),
        ]).then(
          ([
            { coreDynamicResolvingA: coreDynamicResolvingASetup },
            { coreDynamicResolvingA: coreDynamicResolvingAStart },
          ]) => {
            if (coreDynamicResolvingASetup.found && coreDynamicResolvingAStart.found) {
              return res.ok({
                body: {
                  setup: coreDynamicResolvingASetup.contract.someSetupAPI(),
                  start: coreDynamicResolvingAStart.contract.someStartAPI(),
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
      someSetupAPI: () => 'pluginBSetup',
    };
  }

  public start() {
    return {
      someStartAPI: () => 'pluginBStart',
    };
  }

  public stop() {}
}
