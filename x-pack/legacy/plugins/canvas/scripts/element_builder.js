/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

const del = require('del');
const { run } = require('@kbn/dev-utils');
const execa = require('execa');

const asyncPipeline = promisify(pipeline);

const {
  ELEMENT_BUILDER_SRC,
  KIBANA_ROOT,
  STATS_OUTPUT,
  ELEMENT_BUILDER_FILE,
} = require('../element_builder/constants');

run(
  async ({ log, flags }) => {
    const options = {
      cwd: KIBANA_ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
      buffer: false,
    };

    log.info('pre-req: Ensuring Kibana SCSS is built.');
    // Ensure SASS has been built completely before building the runtime.
    execa.sync(process.execPath, ['scripts/build_sass'], {
      ...options,
    });

    const webpackConfig = path.resolve(ELEMENT_BUILDER_SRC, 'webpack.config.js');

    const clean = () => {
      log.info('Deleting previous build.');
      del.sync([ELEMENT_BUILDER_FILE], { force: true });
    };

    if (flags.clean) {
      clean();
    }

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
          ...(process.stdout.isTTY ? ['--progress'] : []),
          '--hide-modules',
          '--display-entrypoints',
          'false',
          '--content-base',
          ELEMENT_BUILDER_SRC,
        ],
        options
      );
      return;
    }

    if (flags.stats) {
      log.info('Writing Webpack stats...');
      const output = execa(
        require.resolve('webpack/bin/webpack'),
        ['--config', webpackConfig, '--profile', '--json'],
        {
          ...options,
          env,
          stdio: ['ignore', 'pipe', 'inherit'],
        }
      );
      await asyncPipeline(output.stdout, fs.createWriteStream(STATS_OUTPUT));
      log.success('...output written to', STATS_OUTPUT);
      return;
    }

    clean();
    log.info('Building Element Builder...');
    execa.sync(
      'yarn',
      [
        'webpack',
        '--config',
        webpackConfig,
        '--hide-modules',
        ...(process.stdout.isTTY ? ['--progress'] : []),
      ],
      {
        ...options,
        env,
      }
    );
    log.success('...runtime built!');
  },
  {
    description: `
      Build script for the Element Builder.
    `,
    flags: {
      boolean: ['run', 'clean', 'help', 'stats', 'dev'],
      help: `
        --run              Run a server with the runtime
        --dev              Build and/or create stats in development mode.
        --stats            Output Webpack statistics to a stats.json file.
        --clean            Delete the existing build
      `,
    },
  }
);
