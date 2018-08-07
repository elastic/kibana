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
    async tryForTime(timeout, block) {
      const start = Date.now();
      const retryDelay = 502;
      let lastTry = 0;
      let finalMessage;
      let prevMessage;

      while (true) {
        lastTry = Date.now();

        if (lastTry - start > timeout) {
          throw new Error('tryForTime timeout: ' + finalMessage);
        }

        try {
          return await block();
        } catch (error) {
          if (error.message === prevMessage) {
            log.debug('--- tryForTime errored again with the same message  ...');
          } else {
            prevMessage = error.message;
            log.debug('--- tryForTime error: ' + prevMessage);
          }
          finalMessage = error.stack || error.message;
          await delay(retryDelay);
        }
      }
    }

    async try(block) {
      return await this.tryForTime(config.get('timeouts.try'), block);
    }

    async tryMethod(object, method, ...args) {
      return await this.try(() => object[method](...args));
    }
  };
}
