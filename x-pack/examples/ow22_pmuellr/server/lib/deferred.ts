/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function createDeferred() {
  let resolver: any;
  let rejecter: any;

  function resolve(...args: any[]) {
    resolver(...args);
  }

  function reject(...args: any[]) {
    rejecter(...args);
  }

  const promise = new Promise((resolve_, reject_) => {
    resolver = resolve_;
    rejecter = reject_;
  });

  return { promise, resolve, reject };
}
