/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Worker threads start without Kibana's require hooks: set up the node env (TS transpilation
// when running from source) before loading the watchdog worker.
if (process.env.NODE_ENV !== 'production') {
  require('@kbn/setup-node-env');
} else {
  require('@kbn/setup-node-env/dist');
}

require('./worker');
