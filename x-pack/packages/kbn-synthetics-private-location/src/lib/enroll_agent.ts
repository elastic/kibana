/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, spawnSync } from 'child_process';
import * as path from 'path';
import { CliOptions } from '../types';
import { KibanaAPIClient } from './kibana_api_client';

export async function enrollAgent(
  { kibanaUrl, elasticsearchHost }: CliOptions,
  enrollmentToken: string,
  kibanaApiClient: KibanaAPIClient
) {
  const formattedKibanaURL = new URL(kibanaUrl);
  const formattedElasticsearchHost = new URL(elasticsearchHost);
  if (formattedKibanaURL.hostname === 'localhost') {
    formattedKibanaURL.hostname = 'host.docker.internal';
  }
  if (formattedElasticsearchHost.hostname === 'localhost') {
    formattedElasticsearchHost.hostname = 'host.docker.internal';
  }
  const version = `${await kibanaApiClient.getKibanaVersion()}-SNAPSHOT`;
  await new Promise((res, rej) => {
    try {
      const fleetProcess = spawn(
        'docker',
        [
          'run',
          '-e',
          'FLEET_SERVER_ENABLE=1',
          '-e',
          `FLEET_SERVER_ELASTICSEARCH_HOST=${formattedElasticsearchHost.origin}`,
          '-e',
          'FLEET_SERVER_POLICY_ID=fleet-server-policy',
          '-e',
          'FLEET_INSECURE=1',
          '-e',
          `KIBANA_HOST=${formattedKibanaURL.origin}`,
          '-e',
          'KIBANA_USERNAME=elastic',
          '-e',
          'KIBANA_PASSWORD=changeme',
          '-e',
          'KIBANA_FLEET_SETUP=1',
          '-p',
          '8220:8220',
          '--rm',
          `docker.elastic.co/elastic-agent/elastic-agent:${version}`,
        ],
        {
          shell: true,
          cwd: path.join(__dirname, '../'),
          timeout: 120000,
        }
      );
      setTimeout(res, 10_000);
      fleetProcess.on('error', rej);
    } catch (error) {
      rej(error);
    }
  });

  spawnSync(
    'docker',
    [
      'run',
      '-e',
      'FLEET_URL=https://host.docker.internal:8220',
      '-e',
      'FLEET_ENROLL=1',
      '-e',
      `FLEET_ENROLLMENT_TOKEN=${enrollmentToken}`,
      '-e',
      'FLEET_INSECURE=1',
      '--rm',
      `docker.elastic.co/elastic-agent/elastic-agent-complete:${version}`,
    ],
    {
      stdio: 'inherit',
    }
  );
}
