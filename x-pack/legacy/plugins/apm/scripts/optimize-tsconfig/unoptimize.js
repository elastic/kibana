/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable import/no-extraneous-dependencies */

const path = require('path');
const execa = require('execa');
const fs = require('fs');
const promisify = require('util').promisify;
const removeFile = promisify(fs.unlink);
const exists = promisify(fs.exists);

const { apmRoot, filesToIgnore } = require('./paths');

async function unoptimizeTsConfig() {
  for (const filename of filesToIgnore) {
    await execa('git', ['update-index', '--no-skip-worktree', filename]);
    await execa('git', ['checkout', filename]);
  }

  const apmTsConfig = path.join(apmRoot, 'tsconfig.json');
  if (await exists(apmTsConfig)) {
    await removeFile(apmTsConfig);
  }
}

module.exports = {
  unoptimizeTsConfig: () => {
    return unoptimizeTsConfig().then(() => {
      // eslint-disable-next-line no-console
      console.log('Removed APM TypeScript optimizations');
    });
  }
};
