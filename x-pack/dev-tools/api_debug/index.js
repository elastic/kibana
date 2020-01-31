/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import glob from 'glob';
import { bold } from 'chalk';
import { argv } from 'yargs';
import { requestFromApi } from './request_from_api';

async function listFiles() {
  const scan = pattern => {
    return new Promise((resolve, reject) => {
      glob(pattern, {}, (err, files) => (err ? reject(err) : resolve(files)));
    });
  };

  const pattern = resolve(__dirname, './apis/*/index.js');
  const files = await scan(pattern);
  files.forEach(file => {
    const { name, description } = require(file); // eslint-disable-line import/no-dynamic-require
    console.log('    ' + bold(`node ${argv.$0} ${name}`));
    console.log(`      ${description}`);
  });
}

async function showHelp() {
  console.log('\nUsage: node script/api_debug <request_type> [...options]');
  console.log('\nwhere <request_type> is one of:');
  await listFiles();
  console.log('\noptions:');
  console.log('  --no-ssl, -k                    Disable SSL certificate verification');
  console.log('  --headers                       Print the response headers to the console');
  console.log('  --host=[http://localhost:5601]  Host to send requests to');
  console.log(
    `  --basePath                      Kibana server basePath, if it's using one (leading slash is auto-added)`
  );
  console.log(
    '  --auth                          username:password formatted authentication to use for the requests'
  );
}

export function apiDebug() {
  const [requestType] = argv._;

  if (argv.help || !requestType) {
    showHelp();
    return;
  }

  requestFromApi(argv, requestType);
}
