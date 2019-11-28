/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import yaml from 'js-yaml';
import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs';
import path from 'path';
import { argv } from 'yargs';

const config = yaml.safeLoad(
  fs.readFileSync(
    path.join(__filename, '../../../../../../../config/kibana.dev.yml'),
    'utf8'
  )
);

const GITHUB_USERNAME = argv.username as string;
const KIBANA_INDEX = config['kibana.index'] as string;
const ELASTICSEARCH_USERNAME = (argv.esUsername as string) || 'superuser';
const ELASTICSEARCH_PASSWORD = (argv.esPassword ||
  config['elasticsearch.password']) as string;
const BASE_URL = (argv.baseUrl as string) || 'http://localhost:5601';

type User =
  | 'apm_read_user' // read access to all apps + apm index access
  | 'apm_write_user' // read/write access to all apps + apm index access
  | 'kibana_write_user'; // read/write access to all apps (no apm index access)

const READ_ROLE = `kibana_read_${GITHUB_USERNAME}`;
const WRITE_ROLE = `kibana_write_${GITHUB_USERNAME}`;

init().catch(e => {
  console.log(e);
});

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
    return;
  }

  if (!GITHUB_USERNAME) {
    console.log(
      'Please specify your github username with `--username <username>` '
    );
    return;
  }

  // create roles
  await createRole({ role: READ_ROLE, privilege: 'read' });
  await createRole({ role: WRITE_ROLE, privilege: 'all' });

  // assign role to user
  await assignRoleToUser({ role: WRITE_ROLE, username: 'apm_write_user' });
  await assignRoleToUser({ role: READ_ROLE, username: 'apm_read_user' });
  await assignRoleToUser({ role: WRITE_ROLE, username: 'kibana_write_user' });
}

async function callKibana(options: AxiosRequestConfig) {
  try {
    const { data } = await axios.request({
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

async function createRole({
  role,
  privilege
}: {
  role: string;
  privilege: 'read' | 'all';
}) {
  await callKibana({
    method: 'PUT',
    url: `/api/security/role/${role}`,
    data: {
      metadata: { version: 1 },
      elasticsearch: { cluster: [], indices: [] },
      kibana: [{ base: [privilege], feature: {}, spaces: ['*'] }]
    }
  });

  console.log(`Created role "${role}" with privilege "${privilege}"`);
}

async function assignRoleToUser({
  role,
  username
}: {
  role: string;
  username: User;
}) {
  // get user
  const user = await callKibana({ url: `/api/security/v1/users/${username}` });

  // ensure user does not already have role
  if (user.roles.includes(role)) {
    console.log(
      `Skipping: Role "${role}" was already applied to user "${user.username}"`
    );
    return;
  }

  // assign role to user
  await callKibana({
    method: 'POST',
    url: `/api/security/v1/users/${username}`,
    data: { ...user, roles: [...user.roles, role] }
  });

  console.log(`Role "${role}" was added to user "${username}"`);
}
