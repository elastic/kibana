/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

export function promiseTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  const boom = Boom.gatewayTimeout('Timed out in ' + ms + 'ms.');
  // @ts-ignore
  boom.isTimeout = true;

  if (ms > 0) {
    // Create a promise that rejects in <ms> milliseconds
    const timeout = new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(boom);
      }, ms);
    });

    // Returns a race between our timeout and the passed in promise
    return Promise.race([promise, timeout]);
  } else {
    return Promise.reject(boom);
  }
}
