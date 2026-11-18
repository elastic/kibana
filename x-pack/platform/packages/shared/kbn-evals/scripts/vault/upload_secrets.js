/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/swc-register').install();
const {
  uploadConfigToVault,
  resolveVaultTarget,
  describeVaultTarget,
} = require('./manage_secrets');
const { KBN_EVALS_VAULT_TYPES } = require('../../src/cli/utils');
const minimist = require('minimist');

async function uploadSecrets() {
  const argv = minimist(process.argv.slice(2), { string: ['suite'] });
  const vault = argv.vault;

  if (!vault || !KBN_EVALS_VAULT_TYPES.includes(vault)) {
    // eslint-disable-next-line no-console
    console.error(`Error: --vault is required (${KBN_EVALS_VAULT_TYPES.join(' | ')})`);
    process.exit(1);
  }

  const target = resolveVaultTarget(vault, argv.suite);
  // eslint-disable-next-line no-console
  console.log(describeVaultTarget(target));
  await uploadConfigToVault(target);
  // eslint-disable-next-line no-console
  console.log(`Uploaded ${target.vaultPath}`);
}

uploadSecrets();
