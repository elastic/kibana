/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type ivm from 'isolated-vm';

// The isolated-vm CPU-time timeout does not accumulate while the isolate is
// suspended in an applySync callback (e.g. console.log). A busy loop that
// calls console.log on every iteration spends almost all its time in host
// callbacks and therefore never triggers the in-isolate timeout. This wall-
// clock timeout runs on the Node.js main thread (which stays unblocked because
// async evalClosure runs the isolate on a worker thread) and enforces an
// absolute deadline regardless of how the isolate spends its time.
export const createWallClockTimeout = (
  isolate: ivm.Isolate,
  executionTimeoutMs: number
): { promise: Promise<never>; cancel: () => void } => {
  let timerId: ReturnType<typeof setTimeout>;

  const promise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      if (!isolate.isDisposed) {
        isolate.dispose();
      }
      // 'Script execution timed out' is matched by normalizeIsolateExecutionError
      // and replaced with the full user-facing message including the limit value.
      reject(new Error('Script execution timed out'));
    }, executionTimeoutMs);
  });

  const cancel = () => clearTimeout(timerId);

  return { promise, cancel };
};
