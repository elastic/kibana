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

import { retryForTruthy } from './retry_for_truthy';
import { retryForSuccess } from './retry_for_success';

export function RetryProvider({ getService }) {
  const config = getService('config');
  const log = getService('log');

  return new class Retry {
    async tryForTime(timeout, block) {
      return await retryForSuccess(log, {
        timeout,
        methodName: 'retry.tryForTime',
        block
      });
    }

    async try(block) {
      return await retryForSuccess(log, {
        timeout: config.get('timeouts.try'),
        methodName: 'retry.try',
        block
      });
    }

    async tryMethod(object, method, ...args) {
      return await retryForSuccess(log, {
        timeout: config.get('timeouts.try'),
        methodName: 'retry.tryMethod',
        block: async () => (
          await object[method](...args)
        )
      });
    }

    async waitForWithTimeout(description, timeout, block) {
      await retryForTruthy(log, {
        timeout,
        methodName: 'retry.waitForWithTimeout',
        description,
        block
      });
    }

    async waitFor(description, block) {
      await retryForTruthy(log, {
        timeout: config.get('timeouts.waitFor'),
        methodName: 'retry.waitFor',
        description,
        block
      });
    }
  };
}
