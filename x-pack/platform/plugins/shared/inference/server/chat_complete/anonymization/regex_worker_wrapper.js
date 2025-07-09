/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const path = require('path');
const { REPO_ROOT } = require('@kbn/repo-info');
// eslint-disable-next-line import/no-dynamic-require
require(path.resolve(REPO_ROOT, 'src/setup_node_env'));
const { workerData } = require('worker_threads');
// eslint-disable-next-line import/no-dynamic-require
module.exports = require(workerData.fullpath);
