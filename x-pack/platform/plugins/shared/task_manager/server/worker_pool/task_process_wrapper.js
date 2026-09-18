/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Checked-in JS entry point forked as a child process by `WorkerPoolService`. Node can only
// fork a JS file, so this small wrapper installs Kibana's TypeScript runtime (dev) - or
// nothing, since dist ships pre-transpiled JS - before requiring the generic dispatcher.
// Mirrors the pattern previously used for the Piscina worker-thread pool.
//
// Protocol with the parent (see `types.ts` for the shared message shapes):
//   1. On boot, before touching any task code, this process sends `{ type: 'ready' }` and
//      then waits for a `go` message. This lets the parent place this process's PID into a
//      dedicated cgroup (if available) *before* any task-controlled allocation happens,
//      closing the race where a task could allocate past its budget before the limit
//      applies.
//   2. On `{ type: 'go', moduleId, input }`, it starts self-reporting `process.memoryUsage()`
//      every 500ms via `{ type: 'memoryUsage', ... }` (used by the parent's fallback-mode RSS
//      *observation*, never for killing - see `WorkerPoolService`), runs the dispatcher, and
//      sends exactly one of `{ type: 'result', result }` / `{ type: 'error', error }`, then
//      exits. Each process performs exactly one run and is then discarded.
if (process.env.NODE_ENV !== 'production') {
  require('@kbn/setup-node-env');
} else {
  require('@kbn/setup-node-env/dist');
}

const MEMORY_REPORT_INTERVAL_MS = 500;

function send(message) {
  if (typeof process.send === 'function') {
    process.send(message);
  }
}

function serializeError(err) {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

process.once('message', async (message) => {
  if (!message || message.type !== 'go') {
    return;
  }

  const { moduleId, input } = message;

  const reportInterval = setInterval(() => {
    const usage = process.memoryUsage();
    send({
      type: 'memoryUsage',
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      external: usage.external,
    });
  }, MEMORY_REPORT_INTERVAL_MS);

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const runTaskWorker = require('./task_worker').default;
    const result = await runTaskWorker({ moduleId, input });
    send({ type: 'result', result });
  } catch (err) {
    send({ type: 'error', error: serializeError(err) });
  } finally {
    clearInterval(reportInterval);
    process.exit(0);
  }
});

send({ type: 'ready' });
