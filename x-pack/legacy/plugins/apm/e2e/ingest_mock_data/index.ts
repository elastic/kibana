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

import { argv } from 'yargs';
import { ingestMockData } from './ingest_mock_data';

const apmServerUrl = argv.serverUrl as string;
const secretToken = argv.secretToken as string;
const eventsFilePath = argv.events as string;

if (!apmServerUrl) {
  console.log('`--server-url` is required');
  process.exit(1);
}

if (!eventsFilePath) {
  console.log('`--events` is required');
  process.exit(1);
}

ingestMockData({ apmServerUrl, eventsFilePath, secretToken }).catch(e => {
  console.log('Ingestion failed:', e);
  process.exit(1);
});
