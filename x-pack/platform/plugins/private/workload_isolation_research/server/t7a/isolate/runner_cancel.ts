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
  cancel: (() => Promise<unknown>) | undefined
): (() => void) => {
  let fired = false;
  const onAbort = () => {
    if (fired) return;
    fired = true;
    abortController.abort(signal.reason);
    // Cancel can reject when the runner's logger is not initialized yet. That rejection
    // must not become an unhandled rejection: the worker treats one as a process crash.
    try {
      void Promise.resolve(cancel?.()).catch(() => undefined);
    } catch {
      /* A synchronous throw is the same class of failure. */
    }
  };
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
};

/**
 * Starts the runner before installing cancel. Alerting's cancel writes a timeout event and
 * throws when that logger has not been initialized, which only happens inside `run()`.
 */
export const beginRunThenCancel = <T>(
  signal: AbortSignal,
  abortController: AbortController,
  runner: {
    run: () => Promise<T>;
    cancel?: () => Promise<unknown>;
  }
): { readonly pending: Promise<T>; readonly unbind: () => void } => {
  const pending = runner.run();
  const unbind = bindRunnerCancel(signal, abortController, () =>
    runner.cancel?.() ?? Promise.resolve()
  );
  return { pending, unbind };
};
