/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// a function which returns a promise with a resolve() and reject() method
export function rPromise() {
  let resolver;
  let rejecter;

  const promise = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });

  promise.resolve = resolver;
  promise.reject = rejecter;

  return promise;
}
