/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { dirname } from 'path';
import { times } from 'lodash';
import { makeJunitReportPath } from '@kbn/test';
import * as UiSharedDeps from '@kbn/ui-shared-deps';

const TOTAL_CI_SHARDS = 4;
const ROOT = dirname(require.resolve('../../package.json'));
const buildHash = String(Number.MAX_SAFE_INTEGER);

module.exports = function (grunt) {
  function pickBrowser() {
    if (grunt.option('browser')) {
      return grunt.option('browser');
    }
    if (process.env.TEST_BROWSER_HEADLESS === '1') {
      return 'Chrome_Headless';
    }
    return 'Chrome';
  }

  function pickReporters() {
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    if (process.env.CI && process.env.DISABLE_JUNIT_REPORTER) {
      return ['dots'];
    }

    if (process.env.CI) {
      return ['dots', 'junit'];
    }

    return ['progress'];
  }

  function getKarmaFiles(shardNum) {
    return [
      'http://localhost:5610/test_bundle/built_css.css',
      // Sets global variables normally set by the bootstrap.js script
      'http://localhost:5610/test_bundle/karma/globals.js',

      ...UiSharedDeps.jsDepFilenames.map(
        (chunkFilename) =>
          `http://localhost:5610/${buildHash}/bundles/kbn-ui-shared-deps/${chunkFilename}`
      ),
      `http://localhost:5610/${buildHash}/bundles/kbn-ui-shared-deps/${UiSharedDeps.jsFilename}`,

      shardNum === undefined
        ? `http://localhost:5610/${buildHash}/bundles/tests.bundle.js`
        : `http://localhost:5610/${buildHash}/bundles/tests.bundle.js?shards=${TOTAL_CI_SHARDS}&shard_num=${shardNum}`,

      `http://localhost:5610/${buildHash}/bundles/kbn-ui-shared-deps/${UiSharedDeps.baseCssDistFilename}`,
      // this causes tilemap tests to fail, probably because the eui styles haven't been
      // included in the karma harness a long some time, if ever
      // `http://localhost:5610/bundles/kbn-ui-shared-deps/${UiSharedDeps.lightCssDistFilename}`,
      `http://localhost:5610/${buildHash}/bundles/tests.style.css`,
    ];
  }

  const config = {
    options: {
      // base path that will be used to resolve all patterns (eg. files, exclude)
      basePath: '',

      captureTimeout: 30000,
      browserNoActivityTimeout: 120000,
      frameworks: ['mocha'],
      plugins: [
        'karma-chrome-launcher',
        'karma-coverage',
        'karma-firefox-launcher',
        'karma-ie-launcher',
        'karma-junit-reporter',
        'karma-mocha',
        'karma-safari-launcher',
      ],
      port: 9876,
      colors: true,
      logLevel: grunt.option('debug') || grunt.option('verbose') ? 'DEBUG' : 'INFO',
      autoWatch: false,
      browsers: [pickBrowser()],
      customLaunchers: {
        Chrome_Headless: {
          base: 'Chrome',
          flags: ['--headless', '--disable-gpu', '--remote-debugging-port=9222'],
        },
      },

      reporters: pickReporters(),

      junitReporter: {
        outputFile: makeJunitReportPath(ROOT, 'karma'),
        useBrowserName: false,
        nameFormatter: (_, result) => [...result.suite, result.description].join(' '),
        classNameFormatter: (_, result) => {
          const rootSuite = result.suite[0] || result.description;
          return `Browser Unit Tests.${rootSuite.replace(/\./g, '·')}`;
        },
      },

      // list of files / patterns to load in the browser
      files: getKarmaFiles(),

      proxies: {
        '/tests/': 'http://localhost:5610/tests/',
        '/test_bundle/': 'http://localhost:5610/test_bundle/',
        [`/${buildHash}/bundles/`]: `http://localhost:5610/${buildHash}/bundles/`,
      },

      client: {
        mocha: {
          reporter: 'html', // change Karma's debug.html to the mocha web reporter
          timeout: 10000,
          slow: 5000,
        },
      },
    },

    dev: { singleRun: false },
    unit: { singleRun: true },
    coverage: {
      singleRun: true,
      reporters: ['coverage'],
      coverageReporter: {
        reporters: [{ type: 'html', dir: 'coverage' }, { type: 'text-summary' }],
      },
    },
  };

  /**
   *  ------------------------------------------------------------
   *  CI sharding
   *  ------------------------------------------------------------
   *
   *  Every test retains nearly all of the memory it causes to be allocated,
   *  which has started to kill the test browser as the size of the test suite
   *  increases. This is a deep-rooted problem that will take some serious
   *  work to fix.
   *
   *  CI sharding is a short-term solution that splits the top-level describe
   *  calls into different "shards" and instructs karma to only run one shard
   *  at a time, reloading the browser in between each shard and forcing the
   *  memory from the previous shard to be released.
   *
   *  ## how
   *
   *  Rather than modify the bundling process to produce multiple testing
   *  bundles, top-level describe calls are sharded by their first argument,
   *  the suite name.
   *
   *  The number of shards to create is controlled with the TOTAL_CI_SHARDS
   *  constant defined at the top of this file.
   *
   *  ## controlling sharding
   *
   *  To control sharding in a specific karma configuration, the total number
   *  of shards to create (?shards=X), and the current shard number
   *  (&shard_num=Y), are added to the testing bundle url and read by the
   *  test_harness/setup_test_sharding[1] module. This allows us to use a
   *  different number of shards in different scenarios (ie. running
   *  `yarn test:karma` runs the tests in a single shard, effectively
   *  disabling sharding)
   *
   *  These same parameters can also be defined in the URL/query string of the
   *  karma debug page (started when you run `yarn test:karma:debug`).
   *
   *  ## debugging
   *
   *  It is *possible* that some tests will only pass if run after/with certain
   *  other suites. To debug this, make sure that your tests pass in isolation
   *  (by clicking the suite name on the karma debug page) and that it runs
   *  correctly in it's given shard (using the `?shards=X&shard_num=Y` query
   *  string params on the karma debug page). You can spot the shard number
   *  a test is running in by searching for the "ready to load tests for shard X"
   *  log message.
   *
   *  [1]: src/legacy/ui/public/test_harness/test_sharding/setup_test_sharding.js
   */
  times(TOTAL_CI_SHARDS, (i) => {
    const n = i + 1;
    config[`ciShard-${n}`] = {
      singleRun: true,
      options: {
        files: getKarmaFiles(n),
      },
    };
  });

  return config;
};
