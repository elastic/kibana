/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { run } = require('@kbn/dev-utils');
const { runXPackScript } = require('./_helpers');

// Due to https://github.com/facebook/jest/issues/7267, folders that start with `.`
// are ignored if using watchman.  Disabling watchman makes testing slow.  So
// we're making this script allow
run(
  ({ log, flags }) => {
    const { all, storybook, update } = flags;
    let { path } = flags;
    let options = [];

    if (!path) {
      // Mitigation for https://github.com/facebook/jest/issues/7267
      if (all || storybook || update) {
        options = ['--no-cache', '--no-watchman'];
      }

      if (all) {
        log.info('Running all available tests. This will take a while...');
        path = 'legacy/plugins/canvas';
      } else if (storybook || update) {
        path = 'legacy/plugins/canvas/.storybook';

        if (update) {
          log.info('Updating Storybook Snapshot tests...');
          options.push('-u');
        } else {
          log.info('Running Storybook Snapshot tests...');
        }
      } else {
        log.info('Running tests. This does not include Storybook Snapshots...');
        path = 'legacy/plugins/canvas';
      }
    } else {
      log.info(`Running tests found at ${path}...`);
    }

    process.argv.splice(2, process.argv.length - 2);
    runXPackScript('jest', [path].concat(options));
  },
  {
    description: `
      Jest test runner for Canvas. By default, will not include Storybook Snapshots.
    `,
    flags: {
      boolean: ['all', 'storybook', 'update'],
      string: ['path'],
      help: `
        --all              Runs all tests and snapshots.  Slower.
        --storybook        Runs Storybook Snapshot tests only.
        --update           Updates Storybook Snapshot tests.
        --path <string>    Runs any tests at a given path. 
      `,
    },
  }
);
