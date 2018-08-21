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

import { inspect } from 'util';

const delay = ms => new Promise(resolve => (
  setTimeout(resolve, ms)
));

const returnTrue = () => true;

const defaultOnFailure = (methodName) => (lastError) => {
  throw new Error(`${methodName} timeout: ${lastError.stack || lastError.message}`);
};

/**
 * Run a function and return either an error or result
 * @param {Function} block
 */
async function runAttempt(block) {
  try {
    return {
      result: await block()
    };
  } catch (error) {
    return {
      // we rely on error being truthy and throwing falsy values is *allowed*
      // so we cast falsy values to errors
      error: error || new Error(`${inspect(error)} thrown`),
    };
  }
}

export async function retryForSuccess(log, {
  timeout,
  methodName,
  block,
  onFailure = defaultOnFailure(methodName),
  accept = returnTrue
}) {
  const start = Date.now();
  const retryDelay = 502;
  let lastError;

  while (true) {
    if (Date.now() - start > timeout) {
      await onFailure(lastError);
      throw new Error('expected onFailure() option to throw an error');
    }

    const { result, error } = await runAttempt(block);

    if (!error && accept(result)) {
      return result;
    }

    if (error) {
      if (lastError && lastError.message === error.message) {
        log.debug(`--- ${methodName} failed again with the same message...`);
      } else {
        log.debug(`--- ${methodName} error: ${error.message}`);
      }

      lastError = error;
    }

    await delay(retryDelay);
  }
}
