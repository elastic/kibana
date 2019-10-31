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

const { xpackRoot, kibanaRoot, apmRoot, tsconfigTpl } = require('./paths');
const { unoptimizeTsConfig } = require('./unoptimize');

function updateParentTsConfigs() {
  return Promise.all(
    [xpackRoot, kibanaRoot].map(async dir => {
      const filename = path.resolve(dir, 'apm.tsconfig.json');
      const config = json5.parse(await readFile(filename, 'utf-8'));

      const include = [];
      const extendsOption =
        'extends' in config ? { extends: '../apm.tsconfig.json' } : {};

      await writeFile(
        filename,
        JSON.stringify({
          ...config,
          include,
          ...extendsOption
        }),
        { encoding: 'utf-8' }
      );
    })
  );
}

async function setIgnoreChanges() {
  await execa('git', [
    'update-index',
    '--skip-worktree',
    path.resolve(xpackRoot, 'tsconfig.json')
  ]);

  await execa('git', [
    'update-index',
    '--skip-worktree',
    path.resolve(kibanaRoot, 'tsconfig.json')
  ]);
}

const optimizeTsConfig = () => {
  return unoptimizeTsConfig()
    .then(() =>
      Promise.all([
        copyFile(tsconfigTpl, path.resolve(apmRoot, './tsconfig.json')),
        rename(
          path.resolve(xpackRoot, 'tsconfig.json'),
          path.resolve(xpackRoot, 'apm.tsconfig.json')
        ),
        rename(
          path.resolve(kibanaRoot, 'tsconfig.json'),
          path.resolve(kibanaRoot, 'apm.tsconfig.json')
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
