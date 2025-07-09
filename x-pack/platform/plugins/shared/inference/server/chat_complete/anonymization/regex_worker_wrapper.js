/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const { workerData } = require('worker_threads');

if (process.env.NODE_ENV !== 'production') {
  /* eslint-disable @kbn/imports/no_boundary_crossing */
  require('../../../../../../../../src/setup_node_env');
} else {
  // eslint-disable-next-line @kbn/imports/no_unresolvable_imports
  require('../../../../../../src/setup_node_env/dist');
}

// eslint-disable-next-line import/no-dynamic-require
module.exports = require(workerData.fullpath);
