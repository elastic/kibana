/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Checked-in JS entry point for the Piscina worker pool. Node can only load JS as a Worker
// filename, so this small wrapper installs Kibana's TypeScript runtime (dev) - or nothing,
// since dist ships pre-transpiled JS - before requiring the generic dispatcher. Mirrors the
// pattern used by the inference and streams plugins' worker pools.
if (process.env.NODE_ENV !== 'production') {
  require('@kbn/setup-node-env');
} else {
  require('@kbn/setup-node-env/dist');
}

module.exports = require('./task_worker');
