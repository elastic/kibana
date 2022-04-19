/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

import { retryForSuccess } from './retry_for_success';

interface Options {
  timeout: number;
  methodName: string;
  description: string;
  block: () => Promise<boolean>;
  onFailureBlock?: () => Promise<any>;
}

export async function retryForTruthy(
  log: ToolingLog,
  { timeout, methodName, description, block, onFailureBlock }: Options
) {
  log.debug(`Waiting up to ${timeout}ms for ${description}...`);

  await retryForSuccess(log, {
    timeout,
    methodName,
    block,
    onFailureBlock,
    onFailure: (lastError) => {
      let msg = `timed out waiting for ${description}`;

      if (lastError) {
        msg = `${msg} -- last error: ${lastError.stack || lastError.message}`;
      }

      throw new Error(msg);
    },
    accept: (result) => Boolean(result),
  });
}
