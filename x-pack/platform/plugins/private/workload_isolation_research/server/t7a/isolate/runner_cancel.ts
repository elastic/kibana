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
    void cancel?.();
  };
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
};
