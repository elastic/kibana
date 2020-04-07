/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This script is useful for waiting for the Kibana to be ready when authentication is enabled
 *

 * Run the script:
 *
 *  node wait-for-login.js
 *
 ************/

const waitOn = require('wait-on');
const ora = require('ora');

const opts = {
  resources: ['http://localhost:5701/api/status'],
  interval: 5000,
  window: 5000,
  timeout: 600000,
  auth: {
    user: 'admin', // or username
    pass: 'changeme' // or password
  },
  verbose: true
};

const spinner = ora('Please wait for Kibana to be up and running').start();

waitOn(opts, err => {
  if (err) {
    spinner.fail(err);
    process.exit(1);
    return;
  }

  spinner.succeed('Kibana is ready');
});
