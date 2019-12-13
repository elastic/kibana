/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This script will create two roles
 * - a read_only kibana role
 * - a read/write kibana role
 *
 * The two roles will be assigned to the already existing users: `apm_read_user`, `apm_write_user`, `kibana_write_user`
 *
 * This makes it possible to use the existing cloud users locally
 * Usage: node setup-kibana-security.js --username YOUR-GITHUB-USERNAME
 ******************************/

// compile typescript on the fly
require('@babel/register')({
  extensions: ['.ts'],
  plugins: ['@babel/plugin-proposal-optional-chaining'],
  presets: [
    '@babel/typescript',
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ]
});

require('./kibana-security/setup-custom-kibana-user-role.ts');
