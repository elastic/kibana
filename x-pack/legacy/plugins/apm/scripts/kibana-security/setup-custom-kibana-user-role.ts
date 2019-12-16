/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import yaml from 'js-yaml';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import fs from 'fs';
import { union, difference, once } from 'lodash';
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
const TASK_MANAGER_INDEX = config['xpack.task_manager.index'] as string;
const ELASTICSEARCH_USERNAME = (argv.esUsername as string) || 'elastic';
const ELASTICSEARCH_PASSWORD = (argv.esPassword ||
  config['elasticsearch.password']) as string;
const KIBANA_BASE_URL = (argv.baseUrl as string) || 'http://localhost:5601';

interface User {
  username: string;
  roles: string[];
  full_name?: string;
  email?: string;
  enabled?: boolean;
}

const getKibanaBasePath = once(async () => {
  try {
    await axios.request({ url: KIBANA_BASE_URL, maxRedirects: 0 });
  } catch (e) {
    const err = e as AxiosError;
    const { location } = err.response?.headers;
    const isBasePath = RegExp(/^\/\w{3}$/).test(location);
    return isBasePath ? location : '';
  }
  return '';
});

init().catch(e => {
  if (e.response) {
    console.log(
      JSON.stringify({ request: e.config, response: e.response.data }, null, 2)
    );
    return;
  }

  console.log(e);
});

async function init() {
  // kibana.index must be different from `.kibana`
  if (KIBANA_INDEX === '.kibana') {
    console.log(
      'kibana.dev.yml: Please use a custom "kibana.index". Example: "kibana.index: .kibana-john"'
    );
    return;
  }

  if (!KIBANA_INDEX.startsWith('.kibana')) {
    console.log(
      'kibana.dev.yml: "kibana.index" must be prefixed with `.kibana`. Example: "kibana.index: .kibana-john"'
    );
    return;
  }

  if (TASK_MANAGER_INDEX && !TASK_MANAGER_INDEX.startsWith('.kibana')) {
    console.log(
      'kibana.dev.yml: "xpack.task_manager.index" must be prefixed with `.kibana`. Example: "xpack.task_manager.index: .kibana-task-manager-john"'
    );
    return;
  }

  if (!GITHUB_USERNAME) {
    console.log(
      'Please specify your github username with `--username <username>` '
    );
    return;
  }

  const isEnabled = await isSecurityEnabled();
  if (!isEnabled) {
    console.log('Security must be enabled!');
    return;
  }

  const KIBANA_READ_ROLE = `kibana_read_${GITHUB_USERNAME}`;
  const KIBANA_WRITE_ROLE = `kibana_write_${GITHUB_USERNAME}`;

  // create roles
  await createRole({ roleName: KIBANA_READ_ROLE, privilege: 'read' });
  await createRole({ roleName: KIBANA_WRITE_ROLE, privilege: 'all' });

  // read/write access to all apps + apm index access
  await createOrUpdateUser({
    username: 'apm_write_user',
    roles: ['apm_user', KIBANA_WRITE_ROLE]
  });

  // read access to all apps + apm index access
  await createOrUpdateUser({
    username: 'apm_read_user',
    roles: ['apm_user', KIBANA_READ_ROLE]
  });

  // read/write access to all apps (no apm index access)
  await createOrUpdateUser({
    username: 'kibana_write_user',
    roles: [KIBANA_WRITE_ROLE]
  });
}

async function isSecurityEnabled() {
  interface XPackInfo {
    features: { security?: { allow_rbac: boolean } };
  }
  const { features } = await callKibana<XPackInfo>({
    url: `/api/xpack/v1/info`
  });
  return features.security?.allow_rbac;
}

async function callKibana<T>(options: AxiosRequestConfig): Promise<T> {
  const basePath = await getKibanaBasePath();
  const { data } = await axios.request({
    ...options,
    baseURL: KIBANA_BASE_URL + basePath,
    auth: {
      username: ELASTICSEARCH_USERNAME,
      password: ELASTICSEARCH_PASSWORD
    },
    headers: { 'kbn-xsrf': 'true', ...options.headers }
  });
  return data;
}

async function createRole({
  roleName,
  privilege
}: {
  roleName: string;
  privilege: 'read' | 'all';
}) {
  const role = await getRole(roleName);
  if (role) {
    console.log(`Skipping: Role "${roleName}" already exists`);
    return;
  }

  await callKibana({
    method: 'PUT',
    url: `/api/security/role/${roleName}`,
    data: {
      metadata: { version: 1 },
      elasticsearch: { cluster: [], indices: [] },
      kibana: [{ base: [privilege], feature: {}, spaces: ['*'] }]
    }
  });

  console.log(`Created role "${roleName}" with privilege "${privilege}"`);
}

async function createOrUpdateUser(newUser: User) {
  const existingUser = await getUser(newUser.username);
  if (!existingUser) {
    return createUser(newUser);
  }

  return updateUser(existingUser, newUser);
}

async function createUser(newUser: User) {
  const user = await callKibana<User>({
    method: 'POST',
    url: `/internal/security/users/${newUser.username}`,
    data: {
      ...newUser,
      enabled: true,
      password: ELASTICSEARCH_PASSWORD
    }
  });

  console.log(`User "${newUser.username}" was created`);
  return user;
}

async function updateUser(existingUser: User, newUser: User) {
  const { username } = newUser;
  const allRoles = union(existingUser.roles, newUser.roles);
  const hasAllRoles = difference(allRoles, existingUser.roles).length === 0;
  if (hasAllRoles) {
    console.log(
      `Skipping: User "${username}" already has neccesarry roles: "${newUser.roles}"`
    );
    return;
  }

  // assign role to user
  await callKibana({
    method: 'POST',
    url: `/internal/security/users/${username}`,
    data: { ...existingUser, roles: allRoles }
  });

  console.log(`User "${username}" was updated`);
}

async function getUser(username: string) {
  try {
    return await callKibana<User>({
      url: `/internal/security/users/${username}`
    });
  } catch (e) {
    const err = e as AxiosError;

    // return empty if user doesn't exist
    if (err.response?.status === 404) {
      return null;
    }

    throw e;
  }
}

async function getRole(roleName: string) {
  try {
    return await callKibana({
      method: 'GET',
      url: `/api/security/role/${roleName}`
    });
  } catch (e) {
    const err = e as AxiosError;

    // return empty if role doesn't exist
    if (err.response?.status === 404) {
      return null;
    }

    throw e;
  }
}
