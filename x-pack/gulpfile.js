/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('@kbn/plugin-helpers').babelRegister();
require('dotenv').config({ silent: true });

const { writeFileSync } = require('fs');

const gulp = require('gulp');
const g = require('gulp-load-plugins')();
const path = require('path');
const del = require('del');
const runSequence = require('run-sequence');
const pluginHelpers = require('@kbn/plugin-helpers');
const { createToolingLog } = require('@kbn/dev-utils');

const logger = require('./gulp_helpers/logger');
const buildVersion = require('./gulp_helpers/build_version')();
const gitInfo = require('./gulp_helpers/git_info');
const fileGlobs = require('./gulp_helpers/globs');
const { getEnabledPlugins } = require('./gulp_helpers/get_plugins');
const getFlags = require('./gulp_helpers/get_flags');

const pkg = require('./package.json');
const { ensureAllBrowsersDownloaded } = require('./plugins/reporting/server/browsers');
const { createAutoJunitReporter, generateNoticeFromSource } = require('../src/dev');

const buildDir = path.resolve(__dirname, 'build');
const buildTarget = path.resolve(buildDir, 'plugin');
const packageDir = path.resolve(buildDir, 'distributions');
const coverageDir = path.resolve(__dirname, 'coverage');

const MOCHA_OPTIONS = {
  ui: 'bdd',
  reporter: createAutoJunitReporter({
    reportName: 'X-Pack Mocha Tests',
    rootDirectory: __dirname,
  }),
};

gulp.task('prepare', () => ensureAllBrowsersDownloaded());

gulp.task('dev', ['prepare'], () => pluginHelpers.run('start', { flags: getFlags() }));

gulp.task('clean-test', () => {
  logger('Deleting', coverageDir);
  return del([coverageDir]);
});

gulp.task('clean', ['clean-test'], () => {
  const toDelete = [
    buildDir,
    packageDir,
  ];
  logger('Deleting', toDelete.join(', '));
  return del(toDelete);
});

gulp.task('report', () => {
  return gitInfo()
    .then(function (info) {
      g.util.log('Package Name', g.util.colors.yellow(pkg.name));
      g.util.log('Version', g.util.colors.yellow(buildVersion));
      g.util.log('Build Number', g.util.colors.yellow(info.number));
      g.util.log('Build SHA', g.util.colors.yellow(info.sha));
    });
});

gulp.task('build', ['clean', 'report', 'prepare'], async () => {
  await pluginHelpers.run('build', {
    skipArchive: true,
    buildDestination: buildTarget,
  });

  const buildRoot = path.resolve(buildTarget, 'kibana/x-pack');
  const log = createToolingLog('info');
  log.pipe(process.stdout);

  writeFileSync(
    path.resolve(buildRoot, 'NOTICE.txt'),
    await generateNoticeFromSource({
      productName: 'Kibana X-Pack',
      log,
      directory: buildRoot
    })
  );
});

gulp.task('test', (cb) => {
  const preTasks = ['clean-test'];
  runSequence(preTasks, 'testserver', 'testbrowser', cb);
});

gulp.task('testonly', ['testserver', 'testbrowser']);

gulp.task('testserver', () => {
  const globs = [
    'common/**/__tests__/**/*.js',
    'server/**/__tests__/**/*.js',
  ].concat(fileGlobs.forPluginServerTests());

  return gulp.src(globs, { read: false })
    .pipe(g.mocha(MOCHA_OPTIONS));
});

gulp.task('testbrowser', () => {
  return getEnabledPlugins().then(plugins => {
    return pluginHelpers.run('testBrowser', {
      plugins: plugins.join(','),
    });
  });
});

gulp.task('testbrowser-dev', () => {
  return getEnabledPlugins().then(plugins => {
    return pluginHelpers.run('testBrowser', {
      dev: true,
      plugins: plugins.join(','),
    });
  });
});
