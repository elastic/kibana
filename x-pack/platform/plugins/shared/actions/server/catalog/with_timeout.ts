/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Budget for the catalog index read at boot. */
export const CATALOG_LOAD_TIMEOUT_MS = 5_000;
/** Budget for the empty-index catalog fetch at boot. */
export const CATALOG_BOOT_FETCH_TIMEOUT_MS = 8_000;
/** Outer hard stop for catalog boot, below the core 10 s start cap. */
export const CATALOG_BOOT_HARD_STOP_MS = 9_000;

export const withCatalogTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T,
  onError?: (error: unknown) => T
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
    return await Promise.race([
      promise.then(
        (value) => value,
        (error: unknown) => {
          if (timedOut) {
            return new Promise<T>(() => undefined);
          }
          if (onError) {
            return onError(error);
          }
          throw error;
        }
      ),
      timeoutPromise,
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (timedOut) {
      promise.catch(() => undefined);
    }
  }
};
