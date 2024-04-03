/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { generate } = require('@kbn/openapi-generator');
// eslint-disable-next-line import/no-nodejs-modules
const { resolve } = require('path');

const ELASTIC_ASSISTANT_ROOT = resolve(__dirname, '../..');

generate({
  rootDir: ELASTIC_ASSISTANT_ROOT,
  sourceGlob: './impl/schemas/**/*.schema.yaml',
  templateName: 'zod_operation_schema',
});
