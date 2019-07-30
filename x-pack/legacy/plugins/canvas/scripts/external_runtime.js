/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const execa = require('execa');
const devUtils = require('@kbn/dev-utils');

const log = new devUtils.ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

log.info('external_runtime: building');

execa.sync(
  'yarn',
  [
    'webpack-dev-server',
    '--config',
    'x-pack/legacy/plugins/canvas/external_runtime/webpack.config.js',
    '--progress',
    '--hide-modules',
    '--display-entrypoints',
    'false',
    '--content-base',
    'x-pack/legacy/plugins/canvas/external_runtime',
  ],
  {
    cwd: path.resolve(__dirname, '../../../../..'),
    stdio: ['ignore', 'inherit', 'inherit'],
    buffer: false,
  }
);
log.success('external_runtime: built');
