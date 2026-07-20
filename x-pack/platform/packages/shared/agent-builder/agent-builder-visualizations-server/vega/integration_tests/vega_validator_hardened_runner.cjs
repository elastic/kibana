/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { Worker } = require('node:worker_threads');

const workerPath = process.env.VEGA_VALIDATOR_WORKER_PATH;
if (!workerPath) {
  throw new Error('VEGA_VALIDATOR_WORKER_PATH is required');
}

const worker = new Worker(workerPath);

worker.on('message', (message) => process.send?.(message));
worker.on('error', (error) => {
  process.send?.({ ok: false, harnessError: error.message });
});

process.on('message', async (message) => {
  if (message?.type === 'stop') {
    await worker.terminate();
    process.exit(0);
  }

  if (message?.type === 'probe-code-generation') {
    const probe = new Worker(
      `
        const { parentPort } = require('node:worker_threads');
        try {
          Function('return true')();
          parentPort.postMessage(false);
        } catch (error) {
          parentPort.postMessage(
            error instanceof EvalError &&
              error.message.includes('Code generation from strings disallowed')
          );
        }
      `,
      { eval: true }
    );
    const codeGenerationBlocked = await new Promise((resolve, reject) => {
      probe.once('message', resolve);
      probe.once('error', reject);
    });
    await probe.terminate();
    process.send?.({ codeGenerationBlocked });
    return;
  }

  worker.postMessage(message);
});
