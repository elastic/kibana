/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');

const LIBRARY_NAME = 'KbnCanvas';
const SHAREABLE_RUNTIME_NAME = 'kbn_canvas';
const KIBANA_ROOT = path.resolve(__dirname, '../../../../..');
const SHAREABLE_RUNTIME_SRC = path.resolve(
  KIBANA_ROOT,
  'x-pack/legacy/plugins/canvas/shareable_runtime'
);
const SHAREABLE_RUNTIME_OUTPUT = path.resolve(SHAREABLE_RUNTIME_SRC, 'build');
const SHAREABLE_RUNTIME_FILE = path.resolve(
  SHAREABLE_RUNTIME_OUTPUT,
  SHAREABLE_RUNTIME_NAME + '.js'
);
const STATS_OUTPUT = path.resolve(SHAREABLE_RUNTIME_OUTPUT, 'webpack_stats.json');

module.exports = {
  KIBANA_ROOT,
  LIBRARY_NAME,
  SHAREABLE_RUNTIME_FILE,
  SHAREABLE_RUNTIME_NAME,
  SHAREABLE_RUNTIME_OUTPUT,
  SHAREABLE_RUNTIME_SRC,
  STATS_OUTPUT,
};
