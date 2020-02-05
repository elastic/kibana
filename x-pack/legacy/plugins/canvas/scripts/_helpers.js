/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { resolve } = require('path');

exports.runGulpTask = function(name) {
  process.chdir(resolve(__dirname, '../../../..'));
  process.argv.splice(1, 1, require.resolve('gulp/bin/gulp'), name);
  require('gulp/bin/gulp');
};

exports.runKibanaScript = function(name, args = []) {
  process.chdir(resolve(__dirname, '../../../../..'));
  process.argv.splice(2, 0, ...args);
  require('../../../../../scripts/' + name); // eslint-disable-line import/no-dynamic-require
};

exports.runXPackScript = function(name, args = []) {
  process.chdir(resolve(__dirname, '../../../..'));
  process.argv.splice(2, 0, ...args);
  require('../../../../scripts/' + name); // eslint-disable-line import/no-dynamic-require
};
