/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yargs from 'yargs';
import fetch from 'node-fetch';

function log(message: string, data: any) {
  /* eslint-disable no-console */
  console.log(message, JSON.stringify(data, null, 2));
}

interface Policy {
  id: string;
}

async function run() {
  const argv = yargs
    .options({
      kibanaUrl: {
        describe: 'Kibana url',
        type: 'string',
        default: 'http://localhost:5601',
      },
      kibanaUser: {
        describe: 'Kibana username,',
        type: 'string',
        default: 'elastic',
      },
      kibanaPassword: {
        describe: 'Kibana password,',
        type: 'string',
        default: 'changeme',
      },
    })
    .help().argv;

  const { kibanaUrl, kibanaUser, kibanaPassword } = argv;

  const policy = await createPolicy(kibanaUrl, kibanaUser, kibanaPassword);
  log('Policy created', policy);
  const token = await getEnrollmentToken(kibanaUrl, kibanaUser, kibanaPassword, policy.id);
  log('Enrollment token', token);
}

async function createPolicy(
  kibanaURL: string,
  kibanaUser: string,
  kibanaPassword: string
): Promise<Policy> {
  const res = await fetch(`${kibanaURL}/api/ingest/policies`, {
    method: 'POST',
    headers: {
      'kbn-xsrf': 'xsrf',
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${kibanaUser}:${kibanaPassword}`).toString('base64')}`,
    },
    body: JSON.stringify({
      name: 'Dev policy',
    }),
  });

  const json = await res.json();

  return {
    id: json.item.id,
  };
}

async function getEnrollmentToken(
  kibanaURL: string,
  kibanaUser: string,
  kibanaPassword: string,
  policyId: string
): Promise<string> {
  const res = await fetch(
    `${kibanaURL}/api/fleet/policies/${policyId}/enrollment-tokens?regenerate=true`,
    {
      method: 'GET',
      headers: {
        'kbn-xsrf': 'xsrf',
        'content-type': 'application/json',
        authorization: `Basic ${Buffer.from(`${kibanaUser}:${kibanaPassword}`).toString('base64')}`,
      },
    }
  );

  const json = await res.json();
  return json.item.token;
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    log('A unexpected error happened', err);
    process.exit(1);
  });
