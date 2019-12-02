/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createFlagError, run, ToolingLog } from '@kbn/dev-utils';
import fetch from 'node-fetch';
import os from 'os';

const CHECKIN_INTERVAL = 3000; // 3 seconds

interface Agent {
  id: string;
  access_api_key: string;
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

    if (!flags.enrollmentApiKey || typeof flags.enrollmentApiKey !== 'string') {
      throw createFlagError('please provide a single --enrollmentApiKey flag');
    }
    const kibanaUrl: string = (flags.kibanaUrl as string) || 'http://localhost:5601';
    const agent = await enroll(kibanaUrl, flags.enrollmentApiKey as string, log);

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
      string: ['kibanaUrl', 'enrollmentApiKey'],
      help: `
        --kibanaUrl kibanaURL to run the fleet agent
        --enrollmentApiKey enrollment api key
      `,
    },
  }
);

async function checkin(kibanaURL: string, agent: Agent, log: ToolingLog) {
  const res = await fetch(`${kibanaURL}/api/fleet/agents/${agent.id}/checkin`, {
    method: 'POST',
    body: JSON.stringify({
      events: [
        {
          type: 'STATE',
          subtype: 'RUNNING',
          message: 'state changed from STOPPED to RUNNING',
          timestamp: new Date().toISOString(),
          payload: { random: 'data', state: 'RUNNING', previous_state: 'STOPPED' },
          data: '{}',
        },
      ],
    }),
    headers: {
      'kbn-xsrf': 'xxx',
      Authorization: `ApiKey ${agent.access_api_key}`,
    },
  });

  if (res.status === 403) {
    closing = true;
    log.info('Unenrolling agent');
    return;
  }

  const json = await res.json();
  log.info('checkin', json);
}

async function enroll(kibanaURL: string, apiKey: string, log: ToolingLog): Promise<Agent> {
  const res = await fetch(`${kibanaURL}/api/fleet/agents/enroll`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'PERMANENT',
      metadata: {
        local: {
          host: 'localhost',
          ip: '127.0.0.1',
          system: `${os.type()} ${os.release()}`,
          memory: os.totalmem(),
        },
        user_provided: {
          dev_agent_version: '0.0.1',
          region: 'us-east',
        },
      },
    }),
    headers: {
      'kbn-xsrf': 'xxx',
      Authorization: `ApiKey ${apiKey}`,
    },
  });
  const json = await res.json();

  if (!json.success) {
    log.error(JSON.stringify(json, null, 2));
    throw new Error('unable to enroll');
  }

  return {
    id: json.item.id,
    access_api_key: json.item.access_api_key,
  };
}
