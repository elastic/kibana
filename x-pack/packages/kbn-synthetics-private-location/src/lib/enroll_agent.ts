/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import https from 'https';
import * as path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CliOptions } from '../types';
import type { KibanaAPIClient } from './kibana_api_client';

const FLEET_SERVER_POLICY_ID = 'fleet-server-policy';

export interface EnrollAgentOptions {
  containerName?: string;
  skipFleetServer?: boolean;
}

async function ensureFleetServerPolicy(kibanaClient: KibanaAPIClient, logger: ToolingLog) {
  try {
    const { data: existingPolicy } = await kibanaClient.sendRequest({
      method: 'GET',
      url: `api/fleet/agent_policies/${FLEET_SERVER_POLICY_ID}`,
    });
    if (existingPolicy?.item) {
      logger.info(`Fleet Server policy already exists: ${FLEET_SERVER_POLICY_ID}`);
      return;
    }
  } catch {
    // Policy doesn't exist, create it
  }

  logger.info('Creating Fleet Server agent policy...');
  await kibanaClient.sendRequest({
    method: 'POST',
    url: 'api/fleet/agent_policies',
    data: {
      id: FLEET_SERVER_POLICY_ID,
      name: 'Fleet Server policy',
      namespace: 'default',
      has_fleet_server: true,
    },
  });
  logger.info('Fleet Server agent policy created');
}

async function ensureFleetServerIntegration(kibanaClient: KibanaAPIClient, logger: ToolingLog) {
  // Check if fleet_server integration is already on the policy
  const { data: policyData } = await kibanaClient.sendRequest({
    method: 'GET',
    url: `api/fleet/agent_policies/${FLEET_SERVER_POLICY_ID}`,
  });

  const packagePolicies = policyData?.item?.package_policies ?? [];
  const hasFleetServer = packagePolicies.some(
    (pp: { package?: { name?: string } }) => pp?.package?.name === 'fleet_server'
  );

  if (hasFleetServer) {
    logger.info('Fleet Server integration already installed on policy');
    return;
  }

  // Get the latest fleet_server package version
  const { data: pkgData } = await kibanaClient.sendRequest({
    method: 'GET',
    url: 'api/fleet/epm/packages/fleet_server',
  });
  const pkgVersion = pkgData?.item?.version ?? '1.6.0';

  // Install the package
  logger.info(`Installing fleet_server package v${pkgVersion}...`);
  await kibanaClient.sendRequest({
    method: 'POST',
    url: `api/fleet/epm/packages/fleet_server/${pkgVersion}`,
    data: { force: true },
  });

  // Add integration to policy
  logger.info('Adding fleet_server integration to Fleet Server policy...');
  await kibanaClient.sendRequest({
    method: 'POST',
    url: 'api/fleet/package_policies',
    data: {
      name: 'fleet_server-1',
      namespace: 'default',
      policy_id: FLEET_SERVER_POLICY_ID,
      package: { name: 'fleet_server', version: pkgVersion },
      inputs: [
        {
          type: 'fleet-server',
          enabled: true,
          streams: [],
          vars: {
            host: { value: '0.0.0.0', type: 'text' },
            port: { value: [8220], type: 'integer' },
          },
        },
      ],
    },
  });
  logger.info('Fleet Server integration installed');
}

async function waitForFleetServer(logger: ToolingLog, maxWaitMs = 120_000) {
  const start = Date.now();
  const interval = 5_000;
  logger.info('Waiting for Fleet Server to become healthy...');

  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  while (Date.now() - start < maxWaitMs) {
    const healthy = await new Promise<boolean>((resolve) => {
      const req = https.get(
        'https://localhost:8220/api/status',
        { agent: httpsAgent },
        (res) => resolve(res.statusCode === 200)
      );
      req.on('error', () => resolve(false));
      req.setTimeout(3000, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (healthy) {
      logger.info('Fleet Server is healthy');
      return;
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    logger.info(`Fleet Server not ready yet (${elapsed}s elapsed), retrying...`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  logger.warning(
    'Fleet Server did not become healthy within timeout, proceeding anyway (agents will retry)'
  );
}

export async function enrollAgent(
  { kibanaUrl, elasticsearchHost }: CliOptions,
  enrollmentToken: string,
  kibanaApiClient: KibanaAPIClient,
  { containerName, skipFleetServer }: EnrollAgentOptions = {},
  logger?: ToolingLog
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

  if (!skipFleetServer) {
    if (logger) {
      await ensureFleetServerPolicy(kibanaApiClient, logger);
      await ensureFleetServerIntegration(kibanaApiClient, logger);
    }

    const fleetServerName = containerName ? `${containerName}-fleet-server` : undefined;
    await new Promise((res, rej) => {
      try {
        const fleetProcess = spawn(
          'docker',
          [
            'run',
            ...(fleetServerName ? ['--name', fleetServerName] : []),
            '--memory=2g',
            '-d',
            '-e',
            'FLEET_SERVER_ENABLE=1',
            '-e',
            `FLEET_SERVER_ELASTICSEARCH_HOST=${formattedElasticsearchHost.origin}`,
            '-e',
            `FLEET_SERVER_POLICY_ID=${FLEET_SERVER_POLICY_ID}`,
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
            `docker.elastic.co/elastic-agent/elastic-agent:${version}`,
          ],
          {
            shell: true,
            cwd: path.join(__dirname, '../'),
          }
        );
        fleetProcess.on('close', (code) => {
          if (code === 0) res(undefined);
          else rej(new Error(`Fleet Server docker run exited with code ${code}`));
        });
        fleetProcess.on('error', rej);
      } catch (error) {
        rej(error);
      }
    });

    if (logger) {
      await waitForFleetServer(logger);
    }
  }

  await new Promise<void>((res, rej) => {
    try {
      const agentProcess = spawn(
        'docker',
        [
          'run',
          ...(containerName ? ['--name', containerName] : []),
          '--memory=2g',
          '-d',
          '-e',
          'FLEET_URL=https://host.docker.internal:8220',
          '-e',
          'FLEET_ENROLL=1',
          '-e',
          `FLEET_ENROLLMENT_TOKEN=${enrollmentToken}`,
          '-e',
          'FLEET_INSECURE=1',
          `docker.elastic.co/elastic-agent/elastic-agent-complete:${version}`,
        ],
        {
          shell: true,
          stdio: 'inherit',
        }
      );
      agentProcess.on('close', (code) => {
        if (code === 0) res();
        else rej(new Error(`Agent docker run exited with code ${code}`));
      });
      agentProcess.on('error', rej);
    } catch (error) {
      rej(error);
    }
  });
}
