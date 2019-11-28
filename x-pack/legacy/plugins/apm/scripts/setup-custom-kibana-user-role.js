/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */

/*
 * This scripts will create a role that has access to kibana and assign that role to select users
 * This makes it possible to use the existing cloud users locally
 * Usage: node setup-custom-kibana-user-role.js --username YOUR-GITHUB-USERNAME
 ******************************/
const yaml = require('js-yaml');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { argv } = require('yargs');

const config = yaml.safeLoad(
  fs.readFileSync(
    path.join(__filename, '../../../../../../config/kibana.dev.yml'),
    'utf8'
  )
);

const USERS_TO_UPDATE = [
  'apm_read_user', // read access to all apps + apm index access
  'apm_admin_user', // read/write access to all apps + apm index access
  'kibana_admin_user' // read/write access to all apps (no apm index access)
];

const GITHUB_USERNAME = argv.username;
const KIBANA_INDEX = config['kibana.index'];
const ELASTICSEARCH_USERNAME = argv.esUsername || 'superuser';
const ELASTICSEARCH_PASSWORD =
  argv.esPassword || config['elasticsearch.password'];
const BASE_URL = argv.baseUrl || 'http://localhost:5601';

async function callKibana(options) {
  try {
    const { data } = await axios({
      ...options,
      baseURL: BASE_URL,
      auth: {
        username: ELASTICSEARCH_USERNAME,
        password: ELASTICSEARCH_PASSWORD
      },
      headers: { 'kbn-xsrf': 'true', ...options.headers }
    });
    return data;
  } catch (e) {
    if (e.response) {
      throw new Error(
        JSON.stringify(
          { request: e.config, response: e.response.data },
          null,
          2
        )
      );
    }
    throw e;
  }
}

async function init() {
  // kibana.index must be different from `.kibana`
  if (KIBANA_INDEX === '.kibana') {
    console.log(
      'Please use a custom `kibana.index` in kibana.dev.yml. Example: "kibana.index: .kibana-john"'
    );
    return;
  }

  if (!KIBANA_INDEX.startsWith('.kibana')) {
    console.log(
      'Your `kibana.index` must be prefixed with `.kibana`. Example: "kibana.index: .kibana-john"'
    );
    GITHUB_USERNAME;
  }

  if (!GITHUB_USERNAME) {
    console.log(
      'Please specify your github username with `--username <username>` '
    );
    return;
  }

  const ROLE_NAME = `kibana_user_${GITHUB_USERNAME}`;

  // create role
  await callKibana({
    method: 'PUT',
    url: `/api/security/role/${ROLE_NAME}`,
    data: {
      metadata: { version: 1 },
      elasticsearch: { cluster: [], indices: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }]
    }
  });
  console.log(`Created role "${ROLE_NAME}"`);

  const promises = USERS_TO_UPDATE.map(async userToUpdate => {
    // get user
    const user = await callKibana({
      url: `/api/security/v1/users/${userToUpdate}`
    });

    if (user.roles.includes(ROLE_NAME)) {
      console.log(
        `Skipping: Role "${ROLE_NAME}" was already applied to user "${user.username}"`
      );
      return;
    }

    console.log(`Adding role "${ROLE_NAME}" to user "${user.username}"`);

    // assign role to users
    await callKibana({
      method: 'POST',
      url: `/api/security/v1/users/${userToUpdate}`,
      data: { ...user, roles: [...user.roles, ROLE_NAME] }
    });

    console.log(
      `Congratulations! You are now able to login to your local Kibana with: ${USERS_TO_UPDATE.join(
        ', '
      )}`
    );
  });

  // ensure rejections are caught by awaiting
  await Promise.all(promises);
}

init().catch(e => {
  console.log(e);
});
