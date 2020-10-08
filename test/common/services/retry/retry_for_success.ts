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

import { ToolingLog } from '@kbn/dev-utils';
import { inspect } from 'util';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const returnTrue = () => true;

const defaultOnFailure = (methodName: string) => (lastError: Error) => {
  throw new Error(`${methodName} timeout: ${lastError.stack || lastError.message}`);
};

/**
 * Run a function and return either an error or result
 * @param {Function} block
 */
async function runAttempt<T>(block: () => Promise<T>): Promise<{ result: T } | { error: Error }> {
  try {
    return {
      result: await block(),
    };
  } catch (error) {
    return {
      // we rely on error being truthy and throwing falsy values is *allowed*
      // so we cast falsy values to errors
      error: error instanceof Error ? error : new Error(`${inspect(error)} thrown`),
    };
  }
}

interface Options<T> {
  timeout: number;
  methodName: string;
  block: () => Promise<T>;
  onFailureBlock?: () => Promise<T>;
  onFailure?: ReturnType<typeof defaultOnFailure>;
  accept?: (v: T) => boolean;
}

export async function retryForSuccess<T>(log: ToolingLog, options: Options<T>) {
  const { timeout, methodName, block, onFailureBlock, accept = returnTrue } = options;
  const { onFailure = defaultOnFailure(methodName) } = options;

  const start = Date.now();
  const retryDelay = 502;
  let lastError;

  while (true) {
    if (lastError && Date.now() - start > timeout) {
      await onFailure(lastError);
      throw new Error('expected onFailure() option to throw an error');
    } else if (lastError && onFailureBlock) {
      const before = await runAttempt(onFailureBlock);
      if ('error' in before) {
        log.debug(`--- onRetryBlock error: ${before.error.message}`);
      }
    }

    const attempt = await runAttempt(block);

    if ('result' in attempt && accept(attempt.result)) {
      return attempt.result;
    }

    if ('error' in attempt) {
      if (lastError && lastError.message === attempt.error.message) {
        log.debug(`--- ${methodName} failed again with the same message...`);
      } else {
        log.debug(`--- ${methodName} error: ${attempt.error.message}`);
      }

      lastError = attempt.error;
    }

    await delay(retryDelay);
  }
}
