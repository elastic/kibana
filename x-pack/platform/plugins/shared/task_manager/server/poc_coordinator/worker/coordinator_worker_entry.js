/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * Dual-mode worker entry (same idea as screenshotting's pdf worker):
 *  - dist: the build transpiles coordinator_worker.ts to coordinator_worker.js
 *    in place, so require it directly — no transpiler, no @kbn/setup-node-env
 *    (which does not ship in dist).
 *  - source/dev: worker threads start a fresh module context without Kibana's
 *    on-the-fly transpiler, so install @kbn/setup-node-env first and load the
 *    TS module (kbn-workflow-yaml-validate-cli pattern).
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const Path = require('path');
const Fs = require('fs');

const compiled = Path.resolve(__dirname, './coordinator_worker.js');
if (Fs.existsSync(compiled)) {
  require('./coordinator_worker.js');
} else {
  require('@kbn/setup-node-env');
  require('./coordinator_worker');
}
