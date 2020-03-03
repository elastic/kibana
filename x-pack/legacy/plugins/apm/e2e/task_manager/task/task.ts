/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import { startTaskManager, Job } from '../lib';
import { getExitCode, syncGitRepo, downloadFile } from './helpers';

const KIBANA_URL = 'http://localhost:5701';
const ELASTICSEARCH_URL = 'http://localhost:9200';
const APM_SERVER_URL = 'http://localhost:8200';
const APM_SERVER_SECRET_TOKEN = '';
const ELASTICSEARCH_USERNAME = 'admin';
const ELASTICSEARCH_PASSWORD = 'changeme';

const EVENTS_FILE_PATH = path.resolve('./tmp/events.json');
const E2E_ROOT_PATH = path.resolve('../../');
const KIBANA_ROOT_PATH = path.resolve('../../../../../../');

const jobs: Job[] = [
  {
    label: 'APM IT',
    setup: async () => {
      const dockerStatus = await getExitCode('docker', ['info']);

      if (dockerStatus == null || dockerStatus > 0) {
        throw new Error('Please start docker');
      }

      return syncGitRepo({
        url: 'https://github.com/elastic/apm-integration-testing.git',
        cwd: './tmp'
      });
    },
    start: () => {
      return spawn('./scripts/compose.py', ['start', 'master', '--no-kibana'], {
        cwd: './tmp/apm-integration-testing'
      });
    },
    stop: () => {
      return spawn('./scripts/compose.py', ['stop'], {
        cwd: './tmp/apm-integration-testing'
      });
    },
    status: async () => {
      const esRes = await fetch(ELASTICSEARCH_URL);
      const apmServerRes = await fetch(APM_SERVER_URL);
      return esRes.ok && apmServerRes.ok;
    }
  },
  {
    label: 'Reset Elasticsearch',
    setup: () => {
      if (!fs.existsSync(EVENTS_FILE_PATH)) {
        console.log('Downloading file');
        return spawn('curl', [
          'https://storage.googleapis.com/apm-ui-e2e-static-data/events.json',
          '--output',
          EVENTS_FILE_PATH
        ]);

        // return downloadFile(
        //   'https://storage.googleapis.com/apm-ui-e2e-static-data/events.json',
        //   EVENTS_FILE_PATH
        // );
      }
    },
    start: async () => {
      // delete indices
      await fetch(`${ELASTICSEARCH_URL}/apm*`, { method: 'delete' });
      await fetch(`${ELASTICSEARCH_URL}/.apm*`, { method: 'delete' });

      return spawn(
        'yarn',
        [
          'ts-node',
          '--transpile-only',
          './ingest_mock_data/index.ts',
          '--server-url',
          APM_SERVER_URL,
          '--events',
          EVENTS_FILE_PATH,
          '--secretToken',
          APM_SERVER_SECRET_TOKEN
        ],
        {
          cwd: E2E_ROOT_PATH
        }
      );
    }
  },
  {
    label: 'Kibana',
    status: async () => {
      console.log('checking', Date.now());

      const res = await fetch(`${KIBANA_URL}/status`, {
        follow: 0,
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}`
          ).toString('base64')}`
        }
      });
      console.log('ok', res.ok, res.status, res.statusText);
      return res.ok;
    },
    start: () => {
      return spawn(
        'yarn',
        [
          'start',
          '--no-base-path',
          '--config',
          'x-pack/legacy/plugins/apm/e2e/kibana.yml'
        ],
        { cwd: KIBANA_ROOT_PATH }
      );
    }
  },
  {
    label: 'Headless tests',
    start: () => {
      return spawn(
        'yarn',
        [
          'cypress',
          'run',
          '--project',
          './cypress-project',
          '--config',
          'baseUrl=http://localhost:5701',
          '--env',
          'elasticsearch_username=admin,elasticsearch_password=changeme'
        ],
        {
          cwd: E2E_ROOT_PATH,
          env: {
            elasticsearch_username: ELASTICSEARCH_USERNAME,
            elasticsearch_password: ELASTICSEARCH_PASSWORD
          }
        }
      );
    }
  }
];

startTaskManager(jobs);
