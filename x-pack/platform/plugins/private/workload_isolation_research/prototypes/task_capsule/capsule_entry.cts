/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { createRequire } = require('node:module') as typeof import('node:module');
const { parentPort } = require('node:worker_threads') as typeof import('node:worker_threads');

// Read-only dependency resolver: no bootstrap or caches may write into the main checkout.
process.env.NODE_DISABLE_COMPILE_CACHE = '1';
process.env.DISABLE_SWC_REGISTER_CACHE = '1';
delete process.env.DEBUG_SWC_REGISTER_CACHE;
const dependencies = createRequire('/Users/jloleysens/repos/work/kibana/package.json');
const bundled = process.env.WIR_CAPSULE_BUNDLE === '1';
dependencies(bundled ? '@kbn/setup-node-env/dist' : '@kbn/setup-node-env');
const { runCapsuleProbe } = (
  bundled ? require('./target/capsule_kernel.cjs') : require('./capsule_kernel')
) as typeof import('./capsule_kernel');

// Keep each completed fixture resident until its parent explicitly releases or terminates it.
if (parentPort) parentPort.on('message', () => parentPort.close());

void runCapsuleProbe(dependencies).then(
  (result) => {
    if (parentPort) parentPort.postMessage({ ok: true, result });
    else console.log(JSON.stringify({ ok: true, result }));
  },
  (error: Error) => {
    const result = { ok: false, error: error.message, stack: error.stack };
    if (parentPort) parentPort.postMessage(result);
    else console.log(JSON.stringify(result));
    process.exitCode = 1;
  }
);
