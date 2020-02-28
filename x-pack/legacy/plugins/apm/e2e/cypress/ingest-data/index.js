/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

/**
 * This script is useful for ingesting previously generated APM data into Elasticsearch via APM Server
 *
 * You can either:
 *  1. Download a static test data file from: https://storage.googleapis.com/apm-ui-e2e-static-data/events.json
 *  2. Or, generate the test data file yourself by following the steps in: https://github.com/elastic/kibana/blob/5207a0b68a66d4f513fe1b0cedb021b296641712/x-pack/legacy/plugins/apm/cypress/README.md#generate-static-data
 *
 * Run the script:
 *
 *  node replay.js --server-url <apm server url> --secret-token <apm server secret token> --events ./events.json
 *
 ************/

const { argv } = require('yargs');

const APM_SERVER_URL = argv.serverUrl;
const SECRET_TOKEN = argv.secretToken;
const EVENTS_PATH = argv.events;

if (!APM_SERVER_URL) {
  console.log('`--server-url` is required');
  process.exit(1);
}

if (!EVENTS_PATH) {
  console.log('`--events` is required');
  process.exit(1);
}

init().catch(e => {
  console.log('An error occurred:', e);
});
