/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

const MAX_ATTEMPTS = 10;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const errMsg = (err: unknown) => (isObj(err) && typeof err.message === 'string' ? err.message : '');

export async function retryOnStale<T>(log: ToolingLog, fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      if (errMsg(error).includes('stale element reference')) {
        if (attempt >= MAX_ATTEMPTS) {
          throw new Error(`retryOnStale ran out of attempts after ${attempt} tries`);
        }

        log.warning('stale element exception caught, retrying');
        continue;
      }

      throw error;
    }
  }
}
