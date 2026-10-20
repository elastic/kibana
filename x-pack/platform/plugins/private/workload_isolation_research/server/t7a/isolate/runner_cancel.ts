/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Replays Task Manager's abort onto the island runner. */

/** Installs the runner cancel listener. An already-aborted signal must still cancel. */
export const bindRunnerCancel = (
  signal: AbortSignal,
  abortController: AbortController,
  cancel: (() => Promise<unknown>) | undefined,
  onError?: (error: Error) => void
): (() => void) => {
  let fired = false;
  const onAbort = () => {
    if (fired) return;
    fired = true;
    abortController.abort(signal.reason);
    // The rejection is reported and is not an unhandled rejection (that crashes the worker).
    try {
      void Promise.resolve(cancel?.()).catch((error: unknown) => {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
};

/**
 * Starts the runner, then installs cancel, unless the signal is already aborted.
 * Main does not start a task whose timeout already fired. Alerting's cancel writes a
 * timeout event and throws when that logger has not been initialized, which only
 * happens inside `run()`, so a cancel that arrives after `run()` has started still
 * waits for `run()` to begin.
 */
export const beginRunThenCancel = <T>(
  signal: AbortSignal,
  abortController: AbortController,
  runner: {
    run: () => Promise<T>;
    cancel?: () => Promise<unknown>;
  }
): {
  readonly pending: Promise<T | undefined>;
  readonly unbind: () => void;
  readonly cancelledBeforeStart: boolean;
} => {
  if (signal.aborted) {
    return { pending: Promise.resolve(undefined), unbind: () => {}, cancelledBeforeStart: true };
  }
  let cancelError: Error | undefined;
  let cancelInFlight: Promise<void> | undefined;
  const pendingRun = runner.run();
  const unbind = bindRunnerCancel(
    signal,
    abortController,
    async () => {
      cancelInFlight = (async () => {
        try {
          await runner.cancel?.();
        } catch (error) {
          cancelError = error instanceof Error ? error : new Error(String(error));
        }
      })();
      await cancelInFlight;
    },
    (error) => {
      cancelError = error;
    }
  );
  const pending = pendingRun.then(async (value) => {
    if (cancelInFlight) await cancelInFlight;
    if (cancelError) throw cancelError;
    return value;
  });
  return { pending, unbind, cancelledBeforeStart: false };
};
