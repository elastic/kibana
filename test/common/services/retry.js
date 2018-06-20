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

import bluebird from 'bluebird';

export function RetryProvider({ getService }) {
  const config = getService('config');
  const log = getService('log');

  class Retry {
    tryForTime(timeout, block) {
      const start = Date.now();
      const retryDelay = 502;
      let lastTry = 0;
      let finalMessage;
      let prevMessage;

      function attempt() {
        lastTry = Date.now();

        if (lastTry - start > timeout) {
          throw new Error('tryForTime timeout: ' + finalMessage);
        }

        return bluebird
          .try(block)
          .catch(function tryForTimeCatch(err) {
            if (err.message === prevMessage) {
              log.debug('--- tryForTime errored again with the same message  ...');
            } else {
              prevMessage = err.message;
              log.debug('--- tryForTime error: ' + prevMessage);
            }
            finalMessage = err.stack || err.message;
            return bluebird.delay(retryDelay).then(attempt);
          });
      }

      return bluebird.try(attempt);
    }

    try(block) {
      return this.tryForTime(config.get('timeouts.try'), block);
    }

    tryMethod(object, method, ...args) {
      return this.try(() => object[method](...args));
    }
  }

  return new Retry();
}
