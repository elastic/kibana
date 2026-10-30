/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Samples the process's resident set from its own thread, so a peak inside a synchronous render on the main
// thread is still seen. Plain JS: a worker does not inherit the host's transpiler.

const { workerData } = require('node:worker_threads');

const { shared, intervalMs } = workerData;
const peaks = new Float64Array(shared);

setInterval(() => {
  const { rss } = process.memoryUsage();
  if (rss > peaks[0]) {
    peaks[0] = rss;
  }
  peaks[1] += 1;
}, intervalMs).unref();
