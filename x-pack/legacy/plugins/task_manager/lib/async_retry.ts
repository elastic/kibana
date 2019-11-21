/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { after, negate, constant } from 'lodash';

const DEFAULT_RETRIES = 1;
const returnFalseAfterXRetries = (retries: number) => negate(after(retries, () => true));

type AsyncNullaryFunction<T> = () => Promise<T>;

export function asyncRetry<T, E>(
  fn: AsyncNullaryFunction<T>,
  retryOn: (error: E) => boolean = constant(true),
  retries: number = DEFAULT_RETRIES
): AsyncNullaryFunction<T> {
  const shouldRetry = returnFalseAfterXRetries(retries + 1);
  return async function retry(): Promise<T> {
    try {
      return await fn();
    } catch (ex) {
      if (retryOn(ex) && shouldRetry()) {
        return await retry();
      }
      throw ex;
    }
  };
}
