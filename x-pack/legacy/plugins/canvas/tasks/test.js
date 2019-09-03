/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve, join } from 'path';

export default function testTasks(gulp, { mocha }) {
  const canvasRoot = resolve(__dirname, '..');

  function runMocha(globs, { withEnzyme = false, withDOM = false } = {}) {
    const requires = [join(canvasRoot, 'tasks/helpers/babelhook')];

    if (withDOM) {
      requires.push(join(canvasRoot, 'tasks/helpers/dom_setup'));
    }
    if (withEnzyme) {
      requires.push(join(canvasRoot, 'tasks/helpers/enzyme_setup'));
    }

    return gulp.src(globs, { read: false }).pipe(
      mocha({
        ui: 'bdd',
        require: requires,
      })
    );
  }

  const getTestGlobs = rootPath => [
    join(canvasRoot, `${rootPath}/**/__tests__/**/*.js`),
    join(canvasRoot, `!${rootPath}/**/__tests__/fixtures/**/*.js`),
  ];

  const getRootGlobs = rootPath => [join(canvasRoot, `${rootPath}/**/*.js`)];

  gulp.task('canvas:test:common', () => {
    return runMocha(getTestGlobs('common'), { withDOM: true });
  });

  gulp.task('canvas:test:server', () => {
    return runMocha(getTestGlobs('server'));
  });

  gulp.task('canvas:test:browser', () => {
    return runMocha(getTestGlobs('public'), { withEnzyme: true, withDOM: true });
  });

  gulp.task('canvas:test:plugins', () => {
    return runMocha(getTestGlobs('canvas_plugin_src'));
  });

  gulp.task('canvas:test', [
    'canvas:test:plugins',
    'canvas:test:common',
    'canvas:test:server',
    'canvas:test:browser',
  ]);

  gulp.task('canvas:test:dev', () => {
    gulp.watch(getRootGlobs('common'), ['canvas:test:common']);
    gulp.watch(getRootGlobs('server'), ['canvas:test:server']);
    gulp.watch(getRootGlobs('public'), ['canvas:test:browser']);
    gulp.watch(getRootGlobs('canvas_plugin_src'), ['canvas:test:plugins']);
  });
}
