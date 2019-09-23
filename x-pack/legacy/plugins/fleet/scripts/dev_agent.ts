/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yargs from 'yargs';
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

function log(message: string, data: any) {
  /* eslint-disable no-console */
  console.log(message, JSON.stringify(data, null, 2));
}

async function run() {
  const argv = yargs
    .command('$0 <enrollmentToken>', 'Run a development agent')
    .options({
      kibanaUrl: {
        describe: 'Kibana url',
        type: 'string',
      },
    })
    .help().argv;

  const enrollmentToken: string = argv._[0];
  if (!enrollmentToken) {
    throw new Error('Missing enrollment token, see help');
  }
  const kibanaURL: string = argv.kibanaUrl || 'http://localhost:5601';
  const agent = await enroll(kibanaURL, enrollmentToken);

  log('Enrolled with sucess', agent);

  while (!closing) {
    await new Promise((resolve, reject) =>
      setTimeout(() => checkin(kibanaURL, agent).then(resolve, reject), CHECKIN_INTERVAL)
    );
  }
}

async function checkin(kibanaURL: string, agent: Agent) {
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
  log('checkin', json);
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

run()
  .then(() => process.exit(0))
  .catch(err => {
    log(err.message, err);
    process.exit(1);
  });
