/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { retryForSuccess } from './retry_for_success';
import { retryForTruthy } from './retry_for_truthy';

export function RetryProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');

  return new class Retry {
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
  }();
}
