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
        path: '/api/hardening/_pollute_prototypes',
        validate: false,
      },
      async (context, request, response) => {
        const result: Record<string, { prototype?: Record<any, any>; error?: string }> = {
          object: {},
          number: {},
          string: {},
          fn: {},
          array: {},
        };
        // Attempt to pollute Object.prototype
        try {
          (({}) as any).__proto__.polluted = true;
        } catch (e) {
          result.object.error = e.message;
        } finally {
          result.object.prototype = { ...Object.keys(Object.getPrototypeOf({})) };
        }

        // Attempt to pollute String.prototype
        try {
          ('asdf' as any).__proto__.polluted = true;
        } catch (e) {
          result.string.error = e.message;
        } finally {
          result.string.prototype = { ...Object.keys(Object.getPrototypeOf('asf')) };
        }

        // Attempt to pollute Number.prototype
        try {
          (12 as any).__proto__.polluted = true;
        } catch (e) {
          result.number.error = e.message;
        } finally {
          result.number.prototype = { ...Object.keys(Object.getPrototypeOf(12)) };
        }

        // Attempt to pollute Function.prototype
        const fn = function fn() {};
        try {
          (fn as any).__proto__.polluted = true;
        } catch (e) {
          result.fn.error = e.message;
        } finally {
          result.fn.prototype = { ...Object.keys(Object.getPrototypeOf(fn)) };
        }

        // Attempt to pollute Array.prototype
        try {
          ([] as any).__proto__.polluted = true;
        } catch (e) {
          result.array.error = e.message;
        } finally {
          result.array.prototype = { ...Object.keys(Object.getPrototypeOf([])) };
        }

        return response.ok({ body: result });
      }
    );
  }

  public start() {}
  public stop() {}
}
