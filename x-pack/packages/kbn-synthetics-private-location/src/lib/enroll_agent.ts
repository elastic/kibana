/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, spawnSync } from 'child_process';
import * as path from 'path';
import type { CliOptions } from '../types';
import type { KibanaAPIClient } from './kibana_api_client';

const FLEET_SERVER_PORT = 8220;
const FLEET_SERVER_HEALTH_URL = `https://localhost:${FLEET_SERVER_PORT}/api/status`;
const FLEET_SERVER_READY_TIMEOUT = 120_000; // 2 minutes
const FLEET_SERVER_POLL_INTERVAL = 3_000; // 3 seconds

async function waitForFleetServer(): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < FLEET_SERVER_READY_TIMEOUT) {
    try {
      const response = await fetch(FLEET_SERVER_HEALTH_URL, {
        // Fleet Server uses a self-signed cert
        // @ts-ignore - Node 18+ supports this
        dispatcher: new (
          await import('undici')
        ).Agent({
          connect: { rejectUnauthorized: false },
        }),
      });
      if (response.ok) {
        const body = await response.text();
        if (body.includes('HEALTHY') || body.includes('online')) {
          return;
        }
      }
    } catch {
      // Fleet Server not up yet — connection refused / EOF is expected
    }
    await new Promise((r) => setTimeout(r, FLEET_SERVER_POLL_INTERVAL));
  }
  throw new Error(
    `Fleet Server did not become healthy within ${FLEET_SERVER_READY_TIMEOUT / 1000}s`
  );
}

export async function enrollAgent(
  { kibanaUrl, elasticsearchHost, kibanaUsername, kibanaPassword }: CliOptions,
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

  // Use .origin only for localhost (rewritten to host.docker.internal),
  // otherwise preserve the original URL string to keep explicit ports like :443
  const dockerEsHost =
    formattedElasticsearchHost.hostname === 'host.docker.internal'
      ? formattedElasticsearchHost.origin
      : elasticsearchHost;
  const dockerKibanaHost =
    formattedKibanaURL.hostname === 'host.docker.internal' ? formattedKibanaURL.origin : kibanaUrl;
  const version = `${await kibanaApiClient.getKibanaVersion()}-SNAPSHOT`;

  // Start Fleet Server container (runs in background)
  const fleetProcess = spawn(
    'docker',
    [
      'run',
      '-e',
      'FLEET_SERVER_ENABLE=1',
      '-e',
      `FLEET_SERVER_ELASTICSEARCH_HOST=${dockerEsHost}`,
      '-e',
      'FLEET_SERVER_POLICY_ID=fleet-server-policy',
      '-e',
      'FLEET_INSECURE=1',
      '-e',
      `KIBANA_HOST=${dockerKibanaHost}`,
      '-e',
      `KIBANA_USERNAME=${kibanaUsername}`,
      '-e',
      `KIBANA_PASSWORD=${kibanaPassword}`,
      '-e',
      'KIBANA_FLEET_SETUP=1',
      '-p',
      '8220:8220',
      '--rm',
      `docker.elastic.co/elastic-agent/elastic-agent:${version}`,
    ],
    {
      cwd: path.join(__dirname, '../'),
      timeout: 120000,
    }
  );

  // Race: either Fleet Server becomes healthy or the process fails
  const fleetProcessError = new Promise<never>((_, rej) => {
    fleetProcess.on('error', (err) =>
      rej(new Error(`Fleet Server process failed: ${err.message}`))
    );
    fleetProcess.on('close', (code) => {
      if (code !== null && code !== 0) {
        rej(new Error(`Fleet Server exited with code ${code}`));
      }
    });
  });

  await Promise.race([waitForFleetServer(), fleetProcessError]);

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
