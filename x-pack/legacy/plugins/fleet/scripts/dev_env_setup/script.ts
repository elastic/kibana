/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createFlagError, run } from '@kbn/dev-utils';
import fetch from 'node-fetch';

run(
  async ({ flags, log }) => {
    const kibanaUrl = flags.kibanaUrl || 'http://localhost:5601';

    const kibanaUser = flags.kibanaUser || 'elastic';
    const kibanaPassword = flags.kibanaPassword || 'changeme';

    if (kibanaUrl && typeof kibanaUrl !== 'string') {
      throw createFlagError('please provide a single --kibanaUrl flag');
    }
    if (kibanaUser && typeof kibanaUser !== 'string') {
      throw createFlagError('please provide a single --kibanaUser flag');
    }
    if (kibanaPassword && typeof kibanaPassword !== 'string') {
      throw createFlagError('please provide a single --kibanaPassword flag');
    }

    const apiKey = await createEnrollmentApiKey(kibanaUrl, kibanaUser, kibanaPassword);
    log.info('Enrollment API Key', apiKey);
  },
  {
    description: `
      Setup a fleet enrollment API Key.
    `,
    flags: {
      string: ['kibanaUrl', 'kibanaUser', 'kibanaPassword'],
      help: `
        --kibanaUrl kibanaURL to run the fleet agent
        --kibanaUser Kibana username
        --kibanaPassword Kibana password
      `,
    },
  }
);

async function createEnrollmentApiKey(
  kibanaURL: string,
  kibanaUser: string,
  kibanaPassword: string,
  policyId?: string
): Promise<string> {
  const res = await fetch(`${kibanaURL}/api/fleet/enrollment-api-keys`, {
    method: 'POST',
    body: JSON.stringify({
      policy_id: policyId,
    }),
    headers: {
      'kbn-xsrf': 'xsrf',
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${kibanaUser}:${kibanaPassword}`).toString('base64')}`,
    },
  });

  const json = await res.json();
  return json.item.api_key;
}
