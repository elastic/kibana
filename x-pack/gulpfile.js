/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../src/setup_node_env');

const { buildTask } = require('./tasks/build');

// export the tasks that are runnable from the CLI
module.exports = {
  build: buildTask,
};
