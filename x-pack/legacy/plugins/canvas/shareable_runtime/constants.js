/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');

const LIBRARY_NAME = 'KbnCanvas';
const SHAREABLE_RUNTIME_NAME = 'kbn_canvas';

const KIBANA_ROOT_PATH = '../../../../..';
const CANVAS_ROOT_PATH = 'x-pack/legacy/plugins/canvas';
const SHAREABLE_RUNTIME_PATH = 'shareable_runtime';
const SHAREABLE_RUNTIME_OUTPUT_PATH = 'shareable_runtime/build';
const SHAREABLE_RUNTIME_FILE_PATH = 'shareable_runtime/build/kbn_canvas.js';
const STATS_OUTPUT_PATH = 'shareable_runtime/build/webpack_stats.json';

const KIBANA_ROOT = path.resolve(__dirname, KIBANA_ROOT_PATH);
const CANVAS_ROOT = path.resolve(KIBANA_ROOT, CANVAS_ROOT_PATH);
const SHAREABLE_RUNTIME_SRC = path.resolve(CANVAS_ROOT, SHAREABLE_RUNTIME_PATH);
const SHAREABLE_RUNTIME_OUTPUT = path.resolve(CANVAS_ROOT, SHAREABLE_RUNTIME_OUTPUT_PATH);
const SHAREABLE_RUNTIME_FILE = path.resolve(CANVAS_ROOT, SHAREABLE_RUNTIME_FILE_PATH);
const STATS_OUTPUT = path.resolve(CANVAS_ROOT, STATS_OUTPUT_PATH);

module.exports = {
  KIBANA_ROOT,
  LIBRARY_NAME,
  SHAREABLE_RUNTIME_FILE,
  SHAREABLE_RUNTIME_NAME,
  SHAREABLE_RUNTIME_OUTPUT,
  SHAREABLE_RUNTIME_SRC,
  STATS_OUTPUT,
};
