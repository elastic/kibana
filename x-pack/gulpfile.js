/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('@kbn/plugin-helpers').babelRegister();
require('dotenv').config({ silent: true });

const path = require('path');
const gulp = require('gulp');
const mocha = require('gulp-mocha');
const multiProcess = require('gulp-multi-process');
const fancyLog = require('fancy-log');
const pkg = require('./package.json');

const buildDir = path.resolve(__dirname, 'build');
const buildTarget = path.resolve(buildDir, 'plugin');
const packageDir = path.resolve(buildDir, 'distributions');
const coverageDir = path.resolve(__dirname, 'coverage');

const gulpHelpers = {
  buildDir,
  buildTarget,
  coverageDir,
  log: fancyLog,
  mocha,
  multiProcess,
  packageDir,
  pkg,
};

require('./tasks/build')(gulp, gulpHelpers);
require('./tasks/clean')(gulp, gulpHelpers);
require('./tasks/dev')(gulp, gulpHelpers);
require('./tasks/prepare')(gulp, gulpHelpers);
require('./tasks/report')(gulp, gulpHelpers);
require('./tasks/test')(gulp, gulpHelpers);
require('./legacy/plugins/canvas/tasks')(gulp, gulpHelpers);
