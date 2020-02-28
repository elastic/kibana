/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const ELASTICSEARCH_URL = 'http://localhost:9200';
const APM_SERVER_URL = 'http://localhost:8200';
const APM_SERVER_SECRET_TOKEN = 'abcd';

const EVENTS_FILE = './events.json';

async function init() {
  const res = await exec(
    `node ../cypress/ingest-data/replay.js --server-url ${APM_SERVER_URL} --secret-token ${APM_SERVER_SECRET_TOKEN} --events ${EVENTS_FILE}`
  );

  console.log(res);
}

init();
