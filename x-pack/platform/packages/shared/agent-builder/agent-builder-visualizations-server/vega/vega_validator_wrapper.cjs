/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { isMainThread } = require('node:worker_threads');

// Requiring this module on Kibana's main thread returns the path while keeping
// the worker-only bootstrap inert. A regular require also lets the distributable
// dependency scanner discover the native imports below.
module.exports = __filename;

if (!isMainThread) {
  if (process.env.NODE_ENV !== 'production') {
    require('@kbn/setup-node-env');
  } else {
    require('@kbn/setup-node-env/dist');
  }

  const { startVegaValidatorWorker } = require('./vega_validator_worker');

  const loadVegaLibs = async () => {
    const [vegaLite, vega, vegaInterpreter] = await Promise.all([
      import('vega-lite'),
      import('vega'),
      import('vega-interpreter'),
    ]);

    return {
      compile: vegaLite.compile,
      parse: vega.parse,
      View: vega.View,
      expressionInterpreter: vegaInterpreter.expressionInterpreter,
    };
  };

  startVegaValidatorWorker(loadVegaLibs);
}
