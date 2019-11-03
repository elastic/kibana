/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs');
const promisify = require('util').promisify;
const path = require('path');
const json5 = require('json5');
const execa = require('execa');

const copyFile = promisify(fs.copyFile);
const rename = promisify(fs.rename);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const {
  xpackRoot,
  kibanaRoot,
  apmRoot,
  tsconfigTpl,
  filesToIgnore
} = require('./paths');
const { unoptimizeTsConfig } = require('./unoptimize');

function updateParentTsConfigs() {
  return Promise.all(
    [
      path.resolve(xpackRoot, 'apm.tsconfig.json'),
      path.resolve(kibanaRoot, 'tsconfig.json')
    ].map(async filename => {
      const config = json5.parse(await readFile(filename, 'utf-8'));

      await writeFile(
        filename,
        JSON.stringify(
          {
            ...config,
            include: []
          },
          null,
          2
        ),
        { encoding: 'utf-8' }
      );
    })
  );
}

async function setIgnoreChanges() {
  for (const filename of filesToIgnore) {
    await execa('git', ['update-index', '--skip-worktree', filename]);
  }
}

const optimizeTsConfig = () => {
  return unoptimizeTsConfig()
    .then(() =>
      Promise.all([
        copyFile(tsconfigTpl, path.resolve(apmRoot, './tsconfig.json')),
        rename(
          path.resolve(xpackRoot, 'tsconfig.json'),
          path.resolve(xpackRoot, 'apm.tsconfig.json')
        )
      ])
    )
    .then(() => updateParentTsConfigs())
    .then(() => setIgnoreChanges())
    .then(() => {
      // eslint-disable-next-line no-console
      console.log(
        'Created an optimized tsconfig.json for APM. To undo these changes, run `./scripts/unoptimize-tsconfig.js`'
      );
    });
};

module.exports = {
  optimizeTsConfig
};
