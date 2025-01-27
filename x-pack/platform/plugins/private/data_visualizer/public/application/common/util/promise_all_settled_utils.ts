/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isFulfilled = <T>(
  input: PromiseSettledResult<Awaited<T>>
): input is PromiseFulfilledResult<Awaited<T>> => input.status === 'fulfilled';
export const isRejected = <T>(
  input: PromiseSettledResult<Awaited<T>>
): input is PromiseRejectedResult => input.status === 'rejected';
