/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { run } from '@kbn/dev-utils';
import { spawn } from 'child_process';
import { resolve } from 'path';

run(
  async ({ log }) => {
    const specPath = resolve(__dirname, 'openapi.json');
    const prismPath = resolve(__dirname, '../../node_modules/.bin/prism');
    const prismProc = spawn(prismPath, ['mock', specPath, '--cors=false']);

    prismProc.stdout.on('data', data => {
      process.stdout.write(data);
    });

    prismProc.stderr.on('data', data => {
      process.stderr.write(data);
    });

    prismProc.on('close', code => {
      log.info(`Prism mock server exited with code ${code}`);
    });
  },
  {
    description: `
      Sets up a mock server with ingest endpoints defined by openapi spec.
    `,
  }
);
