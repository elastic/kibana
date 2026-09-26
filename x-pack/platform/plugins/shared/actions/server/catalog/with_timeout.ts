/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CATALOG_LOAD_TIMEOUT_MS = 5_000;

export const withCatalogTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      resolve(onTimeout());
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (timedOut) {
      promise.catch(() => undefined);
    }
  }
};
