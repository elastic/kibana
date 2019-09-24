/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createFlagError, run, ToolingLog } from '@kbn/dev-utils';
import fetch from 'node-fetch';

const CHECKIN_INTERVAL = 3000; // 3 seconds

interface Agent {
  id: string;
  access_token: string;
}

let closing = false;

process.once('SIGINT', () => {
  closing = true;
});

run(
  async ({ flags, log }) => {
    if (!flags.kibanaUrl || typeof flags.kibanaUrl !== 'string') {
      throw createFlagError('please provide a single --path flag');
    }

    if (!flags.enrollmentToken || typeof flags.enrollmentToken !== 'string') {
      throw createFlagError('please provide a single --path flag');
    }
    const kibanaUrl: string = (flags.kibanaUrl as string) || 'http://localhost:5601';
    const agent = await enroll(kibanaUrl, flags.enrollmentToken as string);

    log.info('Enrolled with sucess', agent);

    while (!closing) {
      await new Promise((resolve, reject) =>
        setTimeout(() => checkin(kibanaUrl, agent, log).then(resolve, reject), CHECKIN_INTERVAL)
      );
    }
  },
  {
    description: `
      Run a fleet development agent.
    `,
    flags: {
      string: ['kibanaUrl', 'enrollmentToken'],
      help: `
        --kibanaUrl kibanaURL to run the fleet agent
        --enrollmentToken enrollment token
      `,
    },
  }
);

async function checkin(kibanaURL: string, agent: Agent, log: ToolingLog) {
  const res = await fetch(`${kibanaURL}/api/fleet/agents/${agent.id}/checkin`, {
    method: 'POST',
    body: JSON.stringify({
      events: [],
    }),
    headers: {
      'kbn-xsrf': 'xxx',
      'kbn-fleet-access-token': agent.access_token,
    },
  });

  const json = await res.json();
  log.info('checkin', json);
}

async function enroll(kibanaURL: string, token: string): Promise<Agent> {
  const res = await fetch(`${kibanaURL}/api/fleet/agents/enroll`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'PERMANENT',
      metadata: {
        local: {
          host: 'localhost',
        },
        userProvided: {
          key1: 'value1',
        },
      },
    }),
    headers: {
      'kbn-xsrf': 'xxx',
      'kbn-fleet-enrollment-token': token,
    },
  });

  const json = await res.json();
  return {
    id: json.item.id,
    access_token: json.item.access_token,
  };
}
