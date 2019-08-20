/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const execa = require('execa');
const storybook = require('@storybook/react/standalone');

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

storybook({
  mode: 'static',
  configDir: path.resolve(__dirname, './../.storybook'),
  outputDir: path.resolve(__dirname, './../storybook'),
});
