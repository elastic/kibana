/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const devUtils = require('@kbn/dev-utils');
const storybook = require('@storybook/react/standalone');
const execa = require('execa');

const log = new devUtils.ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const options = {
  stdio: ['ignore', 'inherit', 'inherit'],
  buffer: false,
};

execa.sync('node', ['storybook_dll.js'], {
  cwd: __dirname,
  ...options,
});

// Ensure SASS has been built completely before starting Storybook
execa.sync(process.execPath, ['scripts/build_sass'], {
  cwd: path.resolve(__dirname, '../../../..'),
  ...options,
});

// Now watch the SASS sheets for changes
execa(process.execPath, ['scripts/build_sass', '--watch'], {
  cwd: path.resolve(__dirname, '../../../..'),
  ...options,
});

log.info('storybook: Starting Storybook');
storybook({
  mode: 'dev',
  port: 9001,
  configDir: path.resolve(__dirname, './../.storybook'),
});
