/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/swc-register').install();
const {
  retrieveConfigFromVault,
  resolveVaultTarget,
  describeVaultTarget,
} = require('./manage_secrets');
const { KBN_EVALS_VAULT_TYPES } = require('../../src/cli/utils');
const minimist = require('minimist');

async function retrieveSecrets() {
  const argv = minimist(process.argv.slice(2), { string: ['suite', 'version'] });
  const vault = argv.vault;

  if (!vault || !KBN_EVALS_VAULT_TYPES.includes(vault)) {
    // eslint-disable-next-line no-console
    console.error(`Error: --vault is required (${KBN_EVALS_VAULT_TYPES.join(' | ')})`);
    process.exit(1);
  }

  let version;
  if (argv.version !== undefined) {
    if (vault !== 'ci-prod' || !/^[1-9][0-9]*$/.test(argv.version)) {
      // eslint-disable-next-line no-console
      console.error(
        'Error: --version takes a positive integer and only applies to --vault ci-prod'
      );
      process.exit(1);
    }
    version = Number(argv.version);
  }

  const target = resolveVaultTarget(vault, argv.suite);
  // eslint-disable-next-line no-console
  console.log(describeVaultTarget(target));
  await retrieveConfigFromVault(target, version);
}

retrieveSecrets();
