/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';

import execa from 'execa';
import { maybeCreateDockerNetwork, verifyDockerInstalled } from '@kbn/es';
import type { ScoutLogger } from '@kbn/scout';

const API_VERSION_HEADER = { 'elastic-api-version': '2023-10-31' };
const FLEET_SERVER_CONTAINER = 'scout-fleet-server';
const AGENT_IMAGE = 'docker.elastic.co/elastic-agent/elastic-agent';
const FLEET_SERVER_TIMEOUT_MS = 3 * 60 * 1000;
const AGENT_ONLINE_TIMEOUT_MS = 3 * 60 * 1000;
export const REAL_FLEET_SETUP_TIMEOUT_MS = 10 * 60 * 1000;

/** Minimal shape of the Scout `kbnClient`. */
interface KbnClientLike {
  request: <T>(options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) => Promise<{ data: T }>;
}

export interface EnrolledAgent {
  agentId: string;
  hostname: string;
  /** Stops and removes the agent container. */
  stop: () => Promise<void>;
}

export interface RealFleet {
  fleetServerUrl: string;
  /** Starts an Elastic Agent container enrolled into the agent policy and waits until it is online. */
  enrollAgent: (agentPolicyId: string) => Promise<EnrolledAgent>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async <T>(
  description: string,
  timeoutMs: number,
  check: () => Promise<T | undefined>
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result !== undefined) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(3000);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError}` : ''}`);
};

const request = async <T>(
  kbnClient: KbnClientLike,
  method: string,
  path: string,
  body?: unknown
): Promise<T> =>
  (await kbnClient.request<T>({ method, path, headers: API_VERSION_HEADER, body })).data;

/** The agent version to run: the stack version, as a snapshot when Kibana is a snapshot build. */
const getAgentVersion = async (kbnClient: KbnClientLike): Promise<string> => {
  if (process.env.FLEET_REAL_AGENT_VERSION) {
    return process.env.FLEET_REAL_AGENT_VERSION;
  }
  const { version } = await request<{
    version: { number: string; build_snapshot: boolean; build_hash: string };
  }>(kbnClient, 'GET', '/api/status');
  // The build hash is a placeholder (`XXXXXXXX...`) when Kibana runs from source
  const isSnapshot = version.build_snapshot || version.build_hash.startsWith('XXXXXXXXXXXXXXX');
  return `${version.number}${isSnapshot ? '-SNAPSHOT' : ''}`;
};

/** Fleet Server uses a self signed certificate. */
const isFleetServerHealthy = (fleetServerUrl: string): Promise<boolean> =>
  new Promise((resolve) => {
    const req = https.get(
      `${fleetServerUrl}/api/status`,
      { rejectUnauthorized: false, timeout: 5000 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });

const removeContainer = async (name: string) => {
  await execa('docker', ['rm', '-f', name]).catch(() => undefined);
};

/**
 * Starts Fleet Server in Docker and returns what a test needs to enroll agents.
 * Kibana and ES are advertised on the host IP by the `fleet_real_agent` server config set.
 */
export const startRealFleet = async (
  kbnClient: KbnClientLike,
  log: ScoutLogger
): Promise<{ realFleet: RealFleet; stop: () => Promise<void> }> => {
  await verifyDockerInstalled(log as any);
  const agentVersion = await getAgentVersion(kbnClient);
  const agentContainers = new Set<string>();

  await request(kbnClient, 'POST', '/api/fleet/setup');

  const { items: fleetServerHosts } = await request<{ items: Array<{ host_urls: string[] }> }>(
    kbnClient,
    'GET',
    '/api/fleet/fleet_server_hosts'
  );
  const fleetServerUrl = fleetServerHosts[0].host_urls[0];
  const { items: outputs } = await request<{ items: Array<{ type: string; hosts?: string[] }> }>(
    kbnClient,
    'GET',
    '/api/fleet/outputs'
  );
  const esUrl = new URL(outputs.find((output) => output.type === 'elasticsearch')!.hosts![0]);
  // inside the container, ES is reachable through the host
  esUrl.hostname = 'host.docker.internal';

  log.info(`[fleet_real_agent] creating the Fleet Server policy`);
  const { item: fleetServerPolicy } = await request<{ item: { id: string } }>(
    kbnClient,
    'POST',
    '/api/fleet/agent_policies',
    {
      name: `scout-fleet-server-${Date.now()}`,
      namespace: 'default',
      monitoring_enabled: [],
      has_fleet_server: true,
    }
  );
  const { item: fleetServerPackage } = await request<{ item: { title: string; version: string } }>(
    kbnClient,
    'GET',
    '/api/fleet/epm/packages/fleet_server'
  );
  await request(kbnClient, 'POST', '/api/fleet/package_policies', {
    name: `scout-fleet-server-integration-${Date.now()}`,
    namespace: 'default',
    policy_ids: [fleetServerPolicy.id],
    enabled: true,
    inputs: [
      {
        type: 'fleet-server',
        policy_template: 'fleet_server',
        enabled: true,
        streams: [],
        vars: {
          max_agents: { type: 'integer' },
          max_connections: { type: 'integer' },
          custom: { value: '', type: 'yaml' },
        },
      },
    ],
    package: {
      name: 'fleet_server',
      title: fleetServerPackage.title,
      version: fleetServerPackage.version,
    },
  });
  const serviceToken = await request<{ value: string }>(
    kbnClient,
    'POST',
    '/api/fleet/service_tokens',
    {}
  );

  log.info(`[fleet_real_agent] starting Fleet Server ${agentVersion} at ${fleetServerUrl}`);
  await maybeCreateDockerNetwork(log as any);
  await removeContainer(FLEET_SERVER_CONTAINER);
  await execa('docker', [
    'run',
    '--restart',
    'no',
    '--net',
    'elastic',
    '--add-host',
    'host.docker.internal:host-gateway',
    '--rm',
    '--detach',
    '--name',
    FLEET_SERVER_CONTAINER,
    '--hostname',
    FLEET_SERVER_CONTAINER,
    '--env',
    'FLEET_SERVER_ENABLE=1',
    '--env',
    `FLEET_SERVER_ELASTICSEARCH_HOST=${esUrl.toString()}`,
    '--env',
    `FLEET_SERVER_SERVICE_TOKEN=${serviceToken.value}`,
    '--env',
    `FLEET_SERVER_POLICY=${fleetServerPolicy.id}`,
    '--publish',
    `${new URL(fleetServerUrl).port}:8220`,
    `${AGENT_IMAGE}:${agentVersion}`,
  ]);
  await waitFor('Fleet Server to be healthy', FLEET_SERVER_TIMEOUT_MS, async () =>
    (await isFleetServerHealthy(fleetServerUrl)) ? true : undefined
  );

  const enrollAgent = async (agentPolicyId: string): Promise<EnrolledAgent> => {
    const enrollmentKey = await waitFor('the enrollment key', 60_000, async () => {
      const { items } = await request<{ items: Array<{ api_key: string }> }>(
        kbnClient,
        'GET',
        `/api/fleet/enrollment_api_keys?kuery=${encodeURIComponent(`policy_id:"${agentPolicyId}"`)}`
      );
      return items[0]?.api_key;
    });

    const hostname = `scout-agent-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    agentContainers.add(hostname);
    log.info(`[fleet_real_agent] enrolling ${hostname} into ${agentPolicyId}`);
    await execa('docker', [
      'run',
      '--net',
      'elastic',
      '--add-host',
      'host.docker.internal:host-gateway',
      '--rm',
      '--detach',
      '--name',
      hostname,
      '--hostname',
      hostname,
      '--env',
      'FLEET_ENROLL=1',
      '--env',
      `FLEET_URL=${fleetServerUrl}`,
      '--env',
      `FLEET_ENROLLMENT_TOKEN=${enrollmentKey}`,
      '--env',
      'FLEET_INSECURE=true',
      `${AGENT_IMAGE}:${agentVersion}`,
    ]);

    const agentId = await waitFor(`${hostname} to be online`, AGENT_ONLINE_TIMEOUT_MS, async () => {
      const { items } = await request<{ items: Array<{ id: string; status: string }> }>(
        kbnClient,
        'GET',
        `/api/fleet/agents?kuery=${encodeURIComponent(
          `local_metadata.host.hostname:"${hostname}"`
        )}`
      );
      return items[0]?.status === 'online' ? items[0].id : undefined;
    });

    return {
      agentId,
      hostname,
      stop: async () => {
        agentContainers.delete(hostname);
        await removeContainer(hostname);
      },
    };
  };

  return {
    realFleet: { fleetServerUrl, enrollAgent },
    stop: async () => {
      await Promise.all([...agentContainers].map(removeContainer));
      await removeContainer(FLEET_SERVER_CONTAINER);
    },
  };
};
