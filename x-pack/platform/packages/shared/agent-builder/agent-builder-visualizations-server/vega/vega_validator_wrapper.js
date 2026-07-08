/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Worker-thread entrypoint. It bootstraps the Node env so the thread can load
// the TypeScript worker task (transpiled on the fly in dev, prebuilt in prod),
// then hands off to it. Mirrors the pattern used by other Kibana server workers
// (e.g. inference's regex_worker_wrapper.js).
if (process.env.NODE_ENV !== 'production') {
  require('@kbn/setup-node-env');
} else {
  require('@kbn/setup-node-env/dist');
}

require('./vega_validator_worker');
