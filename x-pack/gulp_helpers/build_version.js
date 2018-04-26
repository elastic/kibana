/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const yargs = require('yargs');
const semver = require('semver');
const pkg = require('../package.json');

yargs
  .alias('r', 'release').describe('r', 'Create a release build, not a snapshot');
const argv = yargs.argv;

function getVersion() {
  const { version } = pkg;
  if (!version) {
    throw new Error('No version found in package.json');
  }
  if (!semver.valid(version)) {
    throw new Error(`Version is not valid semver: ${version}`);
  }

  const snapshotText = (argv.release) ? '' : '-SNAPSHOT';
  return `${version}${snapshotText}`;
}

module.exports = getVersion;
