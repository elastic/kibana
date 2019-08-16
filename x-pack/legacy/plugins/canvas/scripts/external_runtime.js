/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const fs = require('fs');
const path = require('path');
const del = require('del');
const devUtils = require('@kbn/dev-utils');
const execa = require('execa');
const getopts = require('getopts');

const {
  RUNTIME_SRC,
  KIBANA_ROOT,
  STATS_OUTPUT,
  RUNTIME_OUTPUT,
} = require('../external_runtime/constants');

const log = new devUtils.ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const unknownFlags = [];
const flags = getopts(process.argv, {
  boolean: ['run', 'clean', 'help', 'stats', 'dev'],
  unknown(name) {
    unknownFlags.push(name);
  },
});

if (unknownFlags.length) {
  log.error(`Unknown flag(s): ${unknownFlags.join(', ')}`);
  flags.help = true;
  process.exitCode = 1;
}

if (flags.help) {
  log.info(`
    Build script for the Canvas External Runtime.

    --run       Run a server with the runtime
    --dev       Build and/or create stats in development mode.
    --stats     Output Webpack statistics to a stats.json file.
    --clean     Delete the existing build
    --help      Show this message
  `);
  process.exit();
}

const webpackConfig = path.resolve(RUNTIME_SRC, 'webpack.config.js');

const clean = () => {
  log.info('Deleting previous build.');
  del.sync([RUNTIME_OUTPUT], { force: true });
};

if (flags.clean) {
  clean();
}

const options = {
  cwd: KIBANA_ROOT,
  stdio: ['ignore', 'inherit', 'inherit'],
  buffer: false,
};

const env = {};

if (!flags.dev) {
  env.NODE_ENV = 'production';
}

if (flags.run) {
  log.info('Starting Webpack Dev Server...');
  execa.sync(
    'yarn',
    [
      'webpack-dev-server',
      '--config',
      webpackConfig,
      '--progress',
      '--hide-modules',
      '--display-entrypoints',
      'false',
      '--content-base',
      RUNTIME_SRC,
    ],
    options
  );
} else if (flags.stats) {
  log.info('Writing Webpack stats...');
  const output = execa(
    './node_modules/.bin/webpack',
    ['--config', webpackConfig, '--profile', '--json'],
    {
      ...options,
      env,
      stdio: ['ignore', 'pipe', 'inherit'],
    }
  );
  output.then(() => log.success('...output written to', STATS_OUTPUT));
  output.stdout.pipe(fs.createWriteStream(STATS_OUTPUT));
} else {
  clean();
  log.info('Building Canvas External Runtime...');
  execa.sync('yarn', ['webpack', '--config', webpackConfig, '--hide-modules'], {
    ...options,
    env,
  });
  log.success('...runtime built!');
}
