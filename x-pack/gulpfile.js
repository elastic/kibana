/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('../src/setup_node_env');

const { buildTask } = require('./tasks/build');
const { devTask } = require('./tasks/dev');
const { testTask, testKarmaTask, testKarmaDebugTask } = require('./tasks/test');
const { prepareTask } = require('./tasks/prepare');

// export the tasks that are runnable from the CLI
module.exports = {
  build: buildTask,
  dev: devTask,
  prepare: prepareTask,
  test: testTask,
  'test:karma': testKarmaTask,
  'test:karma:debug': testKarmaDebugTask,
};
