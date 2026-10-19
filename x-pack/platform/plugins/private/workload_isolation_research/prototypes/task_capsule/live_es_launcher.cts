/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { createRequire } = require('node:module') as typeof import('node:module');
const { join } = require('node:path') as typeof import('node:path');
const root = process.cwd();
const dependencies = createRequire(join(root, 'package.json'));
dependencies('@kbn/setup-node-env');
const { Cluster } = dependencies('@kbn/es') as typeof import('@kbn/es');
const cluster = new Cluster();
const port = Number(process.env.WIR_ES_PORT ?? 9221);
const transportPort = Number(process.env.WIR_ES_TRANSPORT_PORT ?? 9321);
const password = process.env.WIR_LOCAL_ES_PASSWORD;
if (!password) throw new Error('Local task-owned ES credential was not provisioned');
const runId = process.env.WIR_RUN_ID;
if (!runId || !/^t1-phase-b-live-\d{3}$/.test(runId)) throw new Error('Invalid local run ID');
const esArgs = [`transport.port=${transportPort}`];
void cluster
  .installSnapshot({
    version: '9.6.0',
    license: 'trial',
    basePath: join(root, '.es'),
    installPath: join(root, '.es', runId),
    password,
    esArgs,
  })
  .then(({ installPath }) =>
    cluster.run(installPath, {
      port,
      esArgs,
      password,
      skipSecuritySetup: false,
      esJavaOpts: '-Xms512m -Xmx512m',
      readyTimeout: 90000,
      esStdoutLogLevel: 'warn',
    })
  )
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
