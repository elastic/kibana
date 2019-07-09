/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const execa = require('execa'); // eslint-disable-line import/no-extraneous-dependencies

execa.sync(
  '../../../../../node_modules/artillery/bin/artillery',
  [
    'run',
    '--config',
    './load_tests/config.yml',
    '-o',
    // Output detailed json report into .log file to be ignored by git.
    './search.json.log',
    './load_tests/search.yml'
  ],
  { stdio: 'inherit' }
);

// TODO: add more load test senarios
