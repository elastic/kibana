/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';

export class CoreHttpPlugin implements Plugin<CoreHttpPluginSetup, CoreHttpPluginStart> {
  public setup({ http }: CoreSetup, deps: {}) {
    const tryRequestCancellation = async () => {
      const abortController = new AbortController();

      const errorNamePromise = http
        .get('/api/core_http/never_reply', { signal: abortController.signal })
        .then(
          () => {
            return undefined;
          },
          (e) => {
            return e.name;
          }
        );

      // simulating 'real' cancellation by awaiting a bit
      window.setTimeout(() => {
        abortController.abort();
      }, 100);

      return errorNamePromise;
    };

    return {
      tryRequestCancellation,
    };
  }

  public start() {}

  public stop() {}
}

export type CoreHttpPluginSetup = ReturnType<CoreHttpPlugin['setup']>;
export type CoreHttpPluginStart = ReturnType<CoreHttpPlugin['start']>;
