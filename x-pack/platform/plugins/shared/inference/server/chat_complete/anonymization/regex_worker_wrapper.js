/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const { REPO_ROOT } = require('@kbn/repo-info');
const { join } = require('path');

/* eslint-disable @kbn/imports/no_boundary_crossing */
/* eslint-disable import/no-dynamic-require */

if (process.env.NODE_ENV !== 'production') {
  require(join(REPO_ROOT, 'src', 'setup_node_env'));
} else {
  require(join(REPO_ROOT, 'src', 'setup_node_env/dist'));
}

module.exports = require('./regex_worker_task');
