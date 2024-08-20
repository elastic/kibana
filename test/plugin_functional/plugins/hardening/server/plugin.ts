/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';

export class HardeningPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    core.http.createRouter().get(
      {
        path: '/api/hardening/_pollute_object_prototype',
        validate: false,
      },
      async (context, request, response) => {
        let result;
        let error;
        try {
          (({}) as any).__proto__.polluted = true;
        } catch (e) {
          error = e.message;
        } finally {
          result = response.ok({ body: { prototype: Object.getPrototypeOf({}), error } });
        }
        return result;
      }
    );
  }

  public start() {}
  public stop() {}
}
