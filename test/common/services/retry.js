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

const delay = ms => new Promise(resolve => (
  setTimeout(resolve, ms)
));

export function RetryProvider({ getService }) {
  const config = getService('config');
  const log = getService('log');

  return new class Retry {
    async _baseTry({ timeout, attempt, onFailure }) {
      const start = Date.now();
      const retryDelay = 502;
      let lastTry;
      let prevError;

      while (true) {
        lastTry = Date.now();

        if (lastTry - start > timeout) {
          await onFailure();
        }

        const { success, result } = await attempt(prevError);

        if (success) {
          return result;
        }

        prevError = result;
        await delay(retryDelay);
      }
    }

    async tryForTime(timeout, block) {
      return await this._baseTry({
        timeout,
        async attempt(prevError) {
          try {
            return {
              success: true,
              result: await block()
            };
          } catch (error) {
            if (prevError && error.message === prevError.message) {
              log.debug('--- tryForTime errored again with the same message  ...');
            } else {
              log.debug('--- tryForTime error: ' + error.message);
            }

            return {
              success: false,
              result: error
            };
          }
        },

        onFailure(finalError) {
          throw new Error(`tryForTime timeout: ${finalError.stack || finalError.message}`);
        }
      });
    }

    async try(block) {
      return await this.tryForTime(
        config.get('timeouts.try'),
        block
      );
    }

    async tryMethod(object, method, ...args) {
      return await this.try(() => object[method](...args));
    }

    async waitForWithTimeout(description, timeout, block) {
      log.debug('Waiting for', description, '...');

      await this._baseTry({
        timeout,
        attempt: async () => ({
          success: Boolean(await block())
        }),

        onFailure() {
          throw new Error(`timed out waiting for ${description}`);
        }
      });
    }

    async waitFor(description, block) {
      await this.waitForWithTimeout(description, config.get('timeouts.waitFor'), block);
    }
  };
}
