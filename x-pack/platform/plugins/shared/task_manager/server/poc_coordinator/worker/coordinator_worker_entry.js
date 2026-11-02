/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * Worker threads start a fresh module context that has not registered Kibana's
 * on-the-fly TypeScript transpiler, so install it before loading the TS worker
 * (same pattern as kbn-workflow-yaml-validate-cli's validate_worker_entry.js).
 * Dev-mode only; a production build would precompile the worker bundle.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@kbn/setup-node-env');
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('./coordinator_worker');
