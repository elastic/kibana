/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { resolve } = require('path');
process.argv.push('--config', resolve(__dirname, '../jest.config.js'));

console.log(`
A helper proxying to the following command:

  yarn jest --config x-pack/platform/plugins/private/canvas/jest.config.js
`);

if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = 'test';
}

require('jest').run();
