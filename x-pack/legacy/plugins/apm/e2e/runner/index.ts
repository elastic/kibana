/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cypress from 'cypress';
import path from 'path';
import fs from 'fs';
import { spawn, exec as originalExec } from 'child_process';
import util from 'util';
import fetch from 'node-fetch';
const exec = util.promisify(originalExec);

async function getExitCode(
  ...args: Parameters<typeof spawn>
): Promise<number | null> {
  return new Promise(resolve => {
    const child = spawn(...args);
    child.on('exit', code => {
      resolve(code);
    });
  });
}

async function syncGitRepo({ url, cwd }: { url: string; cwd: string }) {
  try {
    const repoPath = path.resolve(cwd, 'apm-integration-testing');
    await fs.promises.access(repoPath);
    return exec('git pull', { cwd: repoPath });
  } catch (e) {
    return exec(`git clone ${url}`, {
      cwd
    });
  }
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  const dest = fs.createWriteStream(filename);
  res.body.pipe(dest);

  return new Promise(resolve => {
    res.body.on('end', resolve);
  });
}

interface Setup {
  cwd: string;
}

const ELASTICSEARCH_URL = 'http://localhost:9200';
const APM_SERVER_URL = 'http://localhost:8200';
const APM_SERVER_SECRET_TOKEN = 'abcd';

const EVENTS_FILE = './events.json';

const jobs = [
  {
    name: 'APM IT',
    setup: async ({ cwd }: Setup) => {
      const dockerStatus = await getExitCode('docker', ['info']);
      if (dockerStatus == null || dockerStatus > 0) {
        throw new Error('Please start docker');
      }

      return syncGitRepo({
        url: 'https://github.com/elastic/apm-integration-testing.git',
        cwd
      });
    },
    start: () => {
      return exec(
        './scripts/compose.py start master --no-kibana --no-xpack-secure'
      );
    },
    status: () => {},
    stop: () => {
      // ./scripts/compose.py stop
    }
  },
  {
    name: 'Reset Elasticsearch',
    setup: async () => {
      return downloadFile(
        'https://storage.googleapis.com/apm-ui-e2e-static-data/events.json',
        EVENTS_FILE
      );
    },
    start: async () => {
      // delete indices
      await fetch(`${ELASTICSEARCH_URL}/apm*`, { method: 'delete' });
      await fetch(`${ELASTICSEARCH_URL}.apm*`, { method: 'delete' });

      // ingest data
      const res = await exec(
        `../ingest-data/replay.js --server-url ${APM_SERVER_URL} --secret-token ${APM_SERVER_SECRET_TOKEN} --events ${EVENTS_FILE}`
      );
      console.log(res);
    }
  },
  {
    name: 'Kibana',
    setup: () => {
      // yarn kbn bootstrap
    },
    start: () => {
      // yarn start --no-base-path --csp.strict=false
    }
  },
  {
    name: 'Tests in browser',
    setup: () => {
      // yarn
    },
    start: () => {
      cypress.open();
    },
    stop: () => {
      cypress.open();
    }
  },
  {
    name: 'Headless tests',
    setup: () => {
      // yarn
    },
    start: () => {
      cypress.run();
    }
  }
];
