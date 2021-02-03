/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { retryForSuccess } from './retry_for_success';
import { retryForTruthy } from './retry_for_truthy';

export function RetryProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');

  return new (class Retry {
    public async tryForTime<T>(
      timeout: number,
      block: () => Promise<T>,
      onFailureBlock?: () => Promise<T>
    ) {
      return await retryForSuccess(log, {
        timeout,
        methodName: 'retry.tryForTime',
        block,
        onFailureBlock,
      });
    }

    public async try<T>(block: () => Promise<T>, onFailureBlock?: () => Promise<T>) {
      return await retryForSuccess(log, {
        timeout: config.get('timeouts.try'),
        methodName: 'retry.try',
        block,
        onFailureBlock,
      });
    }

    public async waitForWithTimeout(
      description: string,
      timeout: number,
      block: () => Promise<boolean>,
      onFailureBlock?: () => Promise<any>
    ) {
      await retryForTruthy(log, {
        timeout,
        methodName: 'retry.waitForWithTimeout',
        description,
        block,
        onFailureBlock,
      });
    }

    public async waitFor(
      description: string,
      block: () => Promise<boolean>,
      onFailureBlock?: () => Promise<any>
    ) {
      await retryForTruthy(log, {
        timeout: config.get('timeouts.waitFor'),
        methodName: 'retry.waitFor',
        description,
        block,
        onFailureBlock,
      });
    }
  })();
}
