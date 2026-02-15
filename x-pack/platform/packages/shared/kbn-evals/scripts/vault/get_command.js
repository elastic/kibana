/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/babel-register').install();
const { getCommand } = require('./manage_secrets');
const minimist = require('minimist');

async function run() {
  const argv = minimist(process.argv.slice(2));
  const format = argv.format || 'vault-write';
  const vault = argv.vault || 'ci-prod';

  if (vault !== 'ci-prod') {
    // eslint-disable-next-line no-console
    console.error('Error: vault parameter must be "ci-prod"');
    process.exit(1);
  }

  if (format !== 'vault-write' && format !== 'env-var') {
    // eslint-disable-next-line no-console
    console.error('Error: format must be "vault-write" or "env-var"');
    process.exit(1);
  }

  const cmd = await getCommand(format, vault);
  // eslint-disable-next-line no-console
  console.log(cmd);
}

run();
