/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// functional version of try/catch, allows you to not have to use
// `let` vars initialied to `undefined` to capture the result value

export async function tryCatch<T>(fn: () => Promise<T>): Promise<T | Error> {
  try {
    return await fn();
  } catch (err) {
    return err;
  }
}
