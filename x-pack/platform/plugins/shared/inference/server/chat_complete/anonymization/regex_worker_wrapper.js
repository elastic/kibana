/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const { workerData } = require('worker_threads');

// When we run from source the worker file is still .ts → transpile on-the-fly
if (workerData.fullpath.endsWith('.ts')) {
  // eslint-disable-next-line import/no-extraneous-dependencies
  require('ts-node').register({ transpileOnly: true });
}

// Compiled worker implementation (the .js file in production)
// eslint-disable-next-line import/no-dynamic-require
module.exports = require(workerData.fullpath);
