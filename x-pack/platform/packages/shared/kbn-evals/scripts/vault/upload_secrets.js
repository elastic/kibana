/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/babel-register').install();
const { uploadConfigToVault } = require('./manage_secrets');
const minimist = require('minimist');

async function uploadSecrets() {
  const argv = minimist(process.argv.slice(2));
  const vault = argv.vault || 'ci-prod';

  if (vault !== 'ci-prod') {
    console.error('Error: vault parameter must be "ci-prod"');
    process.exit(1);
  }

  console.log(`Using ${vault} vault...`);
  await uploadConfigToVault(vault);
}

uploadSecrets();
