/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  const maxAttempts = 1000; // this is a reasonable ceiling to prevent infinite loops
  let lastError;

  for (let i = 1; i < maxAttempts; i++) {
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

    if (Date.now() - start + retryDelay < timeout) {
      await delay(retryDelay);

      // This should probably be _before_ the delay, but it was originally run _after_ the delay
      // and lots of tests have been written with that assumption
      // Also, being here, it doesn't run after the the final error, but this also matches the original behavior
      if (lastError && onFailureBlock) {
        const before = await runAttempt(onFailureBlock);
        if ('error' in before) {
          log.debug(`--- onRetryBlock error: ${before.error.message}`);
        }
      }
    } else {
      // Another delay would put us over the timeout, so we should stop here
      if (lastError) {
        await onFailure(lastError);
        throw new Error('expected onFailure() option to throw an error');
      } else {
        throw new Error(`${methodName} timeout`);
      }
    }
  }

  throw new Error(
    `${methodName} used all ${maxAttempts} attempts - possible infinite loop reached`
  );
}
