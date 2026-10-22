/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs `fn`, treating any promise rejection left unhandled while it's in flight as
 * something to log and swallow rather than let escape to Node's own `unhandledRejection`
 * handling.
 *
 * This matters specifically because of where this package runs real page/bundle code: via
 * `vm.runInContext` against the *same* V8 isolate as the host Kibana server process (see
 * `headless_dom_environment.ts`'s doc comment on realm separation) -- there is no separate
 * process or worker thread boundary the way a real browser tab (or even a `Worker` thread)
 * would provide. Node's unhandled-rejection tracking is isolate-wide, not scoped to the
 * `vm` context that created the promise, so a page's own fire-and-forget rejection (e.g.
 * `@kbn/core`'s `AnalyticsClient.reportEvent` for a best-effort "Kibana Loaded" telemetry
 * event, which legitimately never resolves one of its timing fields in this headless
 * environment -- there's no real "first navigation" the way a browser tab has) is
 * indistinguishable, at the Node level, from a genuine host-process bug. Confirmed live
 * against a dev Kibana: that one rejection reached `src/setup_node_env/exit_on_warning.js`'s
 * global `process.on('unhandledRejection', ...)` handler, which unconditionally calls
 * `process.exit(1)` -- crashing the *entire* Kibana server over a single page's own
 * non-fatal telemetry failure, not just failing this one report.
 *
 * A real browser tab's unhandled promise rejections never crash the browser process (or
 * Kibana) either; swallowing them here (after logging) restores that same isolation for
 * this package's headless render, at the cost of also swallowing a genuine bug in code
 * `fn` itself awaits synchronously without a scoped `try`/`catch` -- acceptable since
 * `renderDashboardReport`'s own render-completion/timeout checks are what actually decide
 * whether a report succeeded, not whether some unrelated promise it never awaited rejected.
 *
 * Not safe to nest or run concurrently with another call to this function in the same
 * process: it swaps out *all* of `process`'s `unhandledRejection` listeners for the
 * duration of `fn`, restoring the originals (and removing its own) when `fn` settles. A
 * concurrent renderer sharing this Node process would have its own unrelated unhandled
 * rejections swallowed too, or (if nested) its restore clobber this call's listener. This
 * package's dashboard renders are not yet parallelized within one process -- revisit if
 * that changes.
 */
export const withUnhandledRejectionGuard = async <T>(
  fn: () => Promise<T>,
  onRejection: (reason: unknown) => void
): Promise<T> => {
  const previousListeners = process.listeners(
    'unhandledRejection'
  ) as NodeJS.UnhandledRejectionListener[];
  for (const listener of previousListeners) {
    process.removeListener('unhandledRejection', listener);
  }
  const guardListener: NodeJS.UnhandledRejectionListener = (reason) => {
    onRejection(reason);
  };
  process.on('unhandledRejection', guardListener);
  try {
    return await fn();
  } finally {
    process.removeListener('unhandledRejection', guardListener);
    for (const listener of previousListeners) {
      process.on('unhandledRejection', listener);
    }
  }
};
