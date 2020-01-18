/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');

const ELEMENT_BUILDER_NAME = 'element_builder';
const COMPONENT_NAME = 'ElementBuilder';

const KIBANA_ROOT_PATH = '../../../../..';
const CANVAS_ROOT_PATH = 'x-pack/legacy/plugins/canvas';
const ELEMENT_BUILDER_PATH = 'element_builder';
const ELEMENT_BUILDER_OUTPUT_PATH = 'element_builder/build';
const ELEMENT_BUILDER_FILE_PATH = 'element_builder/build/element_builder.js';
const STATS_OUTPUT_PATH = 'element_builder/build/webpack_stats.json';

const KIBANA_ROOT = path.resolve(__dirname, KIBANA_ROOT_PATH);
const CANVAS_ROOT = path.resolve(KIBANA_ROOT, CANVAS_ROOT_PATH);
const ELEMENT_BUILDER_SRC = path.resolve(CANVAS_ROOT, ELEMENT_BUILDER_PATH);
const ELEMENT_BUILDER_OUTPUT = path.resolve(CANVAS_ROOT, ELEMENT_BUILDER_OUTPUT_PATH);
const ELEMENT_BUILDER_FILE = path.resolve(CANVAS_ROOT, ELEMENT_BUILDER_FILE_PATH);
const STATS_OUTPUT = path.resolve(CANVAS_ROOT, STATS_OUTPUT_PATH);

module.exports = {
  KIBANA_ROOT,
  COMPONENT_NAME,
  ELEMENT_BUILDER_FILE,
  ELEMENT_BUILDER_NAME,
  ELEMENT_BUILDER_OUTPUT,
  ELEMENT_BUILDER_SRC,
  STATS_OUTPUT,
};
