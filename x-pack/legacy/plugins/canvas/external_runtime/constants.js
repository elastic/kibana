/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');

const LIBRARY_NAME = 'KbnCanvas';
const RUNTIME_NAME = 'kbnCanvas';
const KIBANA_ROOT = path.resolve(__dirname, '../../../../..');
const RUNTIME_SRC = path.resolve(KIBANA_ROOT, 'x-pack/legacy/plugins/canvas/external_runtime');
const BUILT_ASSETS = path.resolve(KIBANA_ROOT, 'built_assets');
const RUNTIME_OUTPUT = path.resolve(BUILT_ASSETS, RUNTIME_NAME);
const RUNTIME_FILE = path.resolve(RUNTIME_OUTPUT, RUNTIME_NAME + '.js');
const STATS_OUTPUT = path.resolve(RUNTIME_OUTPUT, 'webpack_stats.json');

module.exports = {
  BUILT_ASSETS,
  KIBANA_ROOT,
  LIBRARY_NAME,
  RUNTIME_FILE,
  RUNTIME_NAME,
  RUNTIME_OUTPUT,
  RUNTIME_SRC,
  STATS_OUTPUT,
};
