/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `AbortSignal.any` (missing in the jsdom Jest environment) plus a `dispose` that removes its listeners. */
export const combineAbortSignals = (
  inputs: ReadonlyArray<AbortSignal | undefined>
): { signal: AbortSignal; dispose: () => void } => {
  const controller = new AbortController();
  const signals = inputs.filter((input): input is AbortSignal => input !== undefined);
  const abort = () => controller.abort();

  for (const signal of signals) {
    signal.addEventListener('abort', abort);
  }
  if (signals.some(({ aborted }) => aborted)) {
    abort();
  }

  return {
    signal: controller.signal,
    dispose: () => {
      for (const signal of signals) {
        signal.removeEventListener('abort', abort);
      }
    },
  };
};
