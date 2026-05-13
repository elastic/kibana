/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { resolve } from 'path';
import {
  CA_TRUSTED_FINGERPRINT,
  FLEET_SERVER_CERT_PATH,
  FLEET_SERVER_KEY_PATH,
  fleetServerDevServiceAccount,
  isAxiosResponseError,
} from '@kbn/dev-utils';
import { KbnClientRequesterError } from '@kbn/kbn-client';
import type {
  CreatePackagePolicyResponse,
  GetAgentsResponse,
  Output,
  PostFleetSetupResponse,
} from '@kbn/fleet-plugin/common';
import { maybeCreateDockerNetwork, verifyDockerInstalled } from '@kbn/es';
import { globalSetupHook, tags } from '@kbn/scout';
import type { KbnClient } from '@kbn/scout';
import { getOsqueryApiService } from '../../common/services/osquery_api_service';
import {
  ALL_SCOUT_PACK_PREFIXES,
  ALL_SCOUT_SAVED_QUERY_PREFIXES,
  cleanOsqueryPacksByPrefix,
  cleanOsquerySavedQueriesByPrefix,
} from '../helpers/defensive_cleanup';

const FLEET_SERVER_CONTAINER = 'scout-fleet-server';
const AGENT_CONTAINER_PREFIX = 'scout-osquery-agent';
const EXPECTED_AGENT_COUNT = 2;
const FLEET_SERVER_CUSTOM_CONFIG = resolve(__dirname, './fleet_server.yml');

/** Matches Fleet `POST /api/fleet/service_tokens` response shape. */
interface FleetServiceTokenBody {
  name: string;
  value: string;
}

interface LiveQuerySubmitResponse {
  data?: { action_id?: string };
}

interface LiveQueryDetailsResponse {
  data?: {
    queries?: Array<{
      successful?: number;
      failed?: number;
      docs?: number;
      status?: string;
    }>;
  };
}

interface SetupLog {
  info: (msg: string) => void;
}

/** HTTP status from errors thrown by `KbnClient` (Axios or wrapped `KbnClientRequesterError`). */
function httpErrorStatus(caught: unknown): number | undefined {
  if (isAxiosResponseError(caught)) {
    return caught.response?.status;
  }

  if (caught instanceof KbnClientRequesterError) {
    return caught.axiosError?.status;
  }

  return undefined;
}

/** Fleet output create/update responses expose `item` with at least `id`. */
interface FleetOutputMutationResponse {
  item: Output;
}

function errorMessage(error: unknown, maxLen: number): string {
  if (error instanceof Error) {
    return error.message.slice(0, maxLen);
  }

  return String(error).slice(0, maxLen);
}

// Fleet + agent container IDs (teardown on signals only).
const containerIds: string[] = [];

function registerCleanup(log: { info: (msg: string) => void; error: (msg: string) => void }) {
  const cleanup = () => {
    for (const id of containerIds) {
      try {
        execa.sync('docker', ['rm', '-f', id]);
        log.info(`[osquery-teardown] Removed container ${id}`);
      } catch {
        // Container may already be removed
      }
    }
  };

  // Do not use 'exit': setup worker exits before tests and would remove containers early.
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });
}

async function isContainerRunning(name: string): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', ['inspect', '--format', '{{.State.Running}}', name]);

    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

async function getOnlineAgentCount(kbnClient: KbnClient): Promise<number> {
  try {
    const { data } = await kbnClient.request<GetAgentsResponse>({
      method: 'GET',
      path: '/api/fleet/agents',
      query: { perPage: 100 },
    });

    // Count online + degraded (osquery still works in degraded).
    return data.items.filter((agent) => agent.status === 'online' || agent.status === 'degraded')
      .length;
  } catch {
    return 0;
  }
}

/**
 * Create an agent policy or find an existing one by name (handles 409 Conflict).
 */
async function findOrCreateAgentPolicy(
  kbnClient: KbnClient,
  name: string,
  body: Record<string, unknown>
): Promise<string> {
  try {
    const { data } = await kbnClient.request<{ item: { id: string } }>({
      method: 'POST',
      path: '/api/fleet/agent_policies?sys_monitoring=true',
      body,
    });

    return data.item.id;
  } catch (e: unknown) {
    if (httpErrorStatus(e) === 409) {
      const { data: listData } = await kbnClient.request<{
        items: Array<{ id: string; name: string }>;
      }>({
        method: 'GET',
        path: '/api/fleet/agent_policies',
        query: { kuery: `name:"${name}"`, perPage: 1 },
      });
      const existing = listData.items.find((p) => p.name === name);
      if (existing) return existing.id;
    }

    throw e;
  }
}

async function getAgentVersion(kbnClient: KbnClient): Promise<string> {
  try {
    const status = await kbnClient.status.get();

    return `${status.version.number}-SNAPSHOT`;
  } catch {
    return '9.4.0-SNAPSHOT';
  }
}

async function waitForAgents(
  kbnClient: KbnClient,
  log: SetupLog,
  expectedCount: number,
  timeoutMs = 360_000
) {
  const start = Date.now();
  let lastCount = 0;

  while (Date.now() - start < timeoutMs) {
    lastCount = await getOnlineAgentCount(kbnClient);

    if (lastCount >= expectedCount) {
      log.info(`[osquery-setup] ${lastCount} agent(s) online`);

      return;
    }

    log.info(
      `[osquery-setup] Waiting for agents... ${lastCount}/${expectedCount} online (${Math.round(
        (Date.now() - start) / 1000
      )}s)`
    );
    await new Promise((r) => setTimeout(r, 5_000));
  }

  throw new Error(
    `Timed out waiting for ${expectedCount} agents to come online (got ${lastCount}) after ${
      timeoutMs / 1000
    }s`
  );
}

async function waitForOsqueryReady(kbnClient: KbnClient, log: SetupLog, timeoutMs = 300_000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const { data: queryResponse } = await kbnClient.request<LiveQuerySubmitResponse>({
        method: 'POST',
        path: '/api/osquery/live_queries',
        body: {
          query: 'select 1 as test;',
          agent_all: true,
        },
      });

      const actionId = queryResponse?.data?.action_id;
      if (!actionId) {
        log.info('[osquery-warmup] No action_id in response, retrying...');
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }

      log.info(`[osquery-warmup] Submitted query, action_id=${actionId}`);

      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5_000));
        try {
          const { data: detailsResponse } = await kbnClient.request<LiveQueryDetailsResponse>({
            method: 'GET',
            path: `/api/osquery/live_queries/${actionId}`,
          });

          const queries = detailsResponse?.data?.queries || [];
          const firstQuery = queries[0];
          if (firstQuery) {
            const { successful, failed, docs, status: qStatus } = firstQuery;
            log.info(
              `[osquery-warmup] Query status: successful=${successful}, failed=${failed}, docs=${docs}, status=${qStatus}`
            );

            if ((successful ?? 0) > 0 || (docs ?? 0) > 0) {
              log.info(
                `[osquery-warmup] Osquery is ready! (successful=${successful}, docs=${docs})`
              );

              return;
            }
          }
        } catch (e: unknown) {
          log.info(`[osquery-warmup] Details check failed: ${errorMessage(e, 80)}`);
        }
      }

      log.info(
        `[osquery-warmup] No successful results yet (${Math.round(
          (Date.now() - start) / 1000
        )}s elapsed), submitting new query...`
      );
    } catch (e: unknown) {
      log.info(
        `[osquery-warmup] Query attempt failed (${errorMessage(e, 100)}), retrying in 10s...`
      );
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  log.info('[osquery-warmup] WARNING: Timed out waiting for osquery to respond. Tests may fail.');
}

/** Managed Fleet Server docker args; token value passed via execa `env` only (not in argv). */
function getManagedFleetServerArgs({
  esHost,
  policyId,
  artifact,
}: {
  esHost: string;
  policyId: string;
  artifact: string;
}): string[] {
  return [
    'run',
    '--name',
    FLEET_SERVER_CONTAINER,
    '--net',
    'elastic',
    '--detach',
    '--add-host',
    'host.docker.internal:host-gateway',
    '-p',
    '8220:8220',
    '--env',
    'FLEET_SERVER_ENABLE=true',
    '--env',
    `FLEET_SERVER_ELASTICSEARCH_HOST=${esHost}`,
    '--env',
    'FLEET_SERVER_SERVICE_TOKEN',
    '--env',
    `FLEET_SERVER_POLICY=${policyId}`,
    '--rm',
    artifact,
  ];
}

/** Standalone Fleet Server args for serverless; ES host → es01; token via execa `env` only. */
function getStandaloneFleetServerArgs({ esUrl }: { esUrl: string }): string[] {
  // Point Fleet Server at es01 on the docker network (host.docker.internal ES is unreachable).
  const dockerEsUrl = new URL(esUrl);
  dockerEsUrl.hostname = 'es01';

  return [
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
    'FLEET_SERVER_CERT=/fleet-server.crt',
    '--env',
    'FLEET_SERVER_CERT_KEY=/fleet-server.key',
    '--env',
    `ELASTICSEARCH_HOSTS=${dockerEsUrl.toString()}`,
    '--env',
    'ELASTICSEARCH_SERVICE_TOKEN',
    '--env',
    `ELASTICSEARCH_CA_TRUSTED_FINGERPRINT=${CA_TRUSTED_FINGERPRINT}`,
    '--volume',
    `${FLEET_SERVER_CERT_PATH}:/fleet-server.crt`,
    '--volume',
    `${FLEET_SERVER_KEY_PATH}:/fleet-server.key`,
    '--volume',
    `${FLEET_SERVER_CUSTOM_CONFIG}:/etc/fleet-server.yml:ro`,
    '--publish',
    '8220:8220',
    // Standalone fleet-server image tracks `latest` (unversioned).
    `docker.elastic.co/observability-ci/fleet-server:latest`,
  ];
}

globalSetupHook(
  'Set up Fleet Server and Elastic Agents for Osquery tests',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  async ({ kbnClient, log, config }) => {
    const isServerless = config.serverless;

    // Skip agent provisioning when Docker is unavailable (e.g. essentials CI).
    try {
      await verifyDockerInstalled(log);
    } catch {
      log.info(
        '[osquery-setup] Docker is not available — skipping Fleet Server and agent provisioning. ' +
          'Tests that require live agents will be filtered out by tag.'
      );

      return;
    }

    registerCleanup(log);

    const fleetServerRunning = await isContainerRunning(FLEET_SERVER_CONTAINER);
    const agent0Running = await isContainerRunning(`${AGENT_CONTAINER_PREFIX}-0`);
    const agent1Running = await isContainerRunning(`${AGENT_CONTAINER_PREFIX}-1`);
    const onlineAgents = await getOnlineAgentCount(kbnClient);

    log.info(
      `[osquery-setup] Existing state: fleet-server=${fleetServerRunning}, ` +
        `agent-0=${agent0Running}, agent-1=${agent1Running}, ` +
        `online agents=${onlineAgents}/${EXPECTED_AGENT_COUNT}`
    );

    if (
      fleetServerRunning &&
      agent0Running &&
      agent1Running &&
      onlineAgents >= EXPECTED_AGENT_COUNT
    ) {
      log.info(
        '[osquery-setup] Fleet Server and agents are already running and enrolled. Skipping provisioning.'
      );

      log.info('[osquery-setup] Verifying osquery is responsive on existing agents...');
      await waitForOsqueryReady(kbnClient, log);
      log.info('[osquery-setup] Osquery warm-up complete. Agents are responsive.');

      return;
    }

    log.info('[osquery-setup] Infrastructure not fully running — provisioning from scratch.');

    const agentVersion = await getAgentVersion(kbnClient);
    const agentArtifact = `docker.elastic.co/elastic-agent/elastic-agent:${agentVersion}`;
    const esUrl = new URL(config.hosts.elasticsearch);
    const esPort = esUrl.port || '9220';
    const host = 'host.docker.internal';

    log.info(`[osquery-setup] Mode: ${isServerless ? 'serverless' : 'stateful'}`);
    log.info(`[osquery-setup] Agent version: ${agentVersion}`);
    log.info(`[osquery-setup] ES URL: ${config.hosts.elasticsearch}`);

    await maybeCreateDockerNetwork(log);

    log.info('[osquery-setup] Cleaning up stale containers...');
    await execa('docker', ['rm', '-f', FLEET_SERVER_CONTAINER]).catch(() => {});
    for (let i = 0; i < EXPECTED_AGENT_COUNT; i++) {
      await execa('docker', ['rm', '-f', `${AGENT_CONTAINER_PREFIX}-${i}`]).catch(() => {});
    }

    log.info('[osquery-setup] Calling Fleet setup...');
    await kbnClient.request<PostFleetSetupResponse>({ method: 'POST', path: '/api/fleet/setup' });
    log.info('[osquery-setup] Fleet setup complete');

    const dockerEsHost = `http://${host}:${esPort}`;
    log.info(`[osquery-setup] Configuring Fleet default output to ${dockerEsHost}...`);
    try {
      const { data: outputsResponse } = await kbnClient.request<{
        items: Array<{
          id: string;
          is_default: boolean;
          hosts?: string[];
          is_preconfigured?: boolean;
        }>;
      }>({
        method: 'GET',
        path: '/api/fleet/outputs',
      });

      const defaultOutput = outputsResponse.items.find((o) => o.is_default);

      if (defaultOutput) {
        const currentHosts = defaultOutput.hosts ?? [];
        if (currentHosts.includes(dockerEsHost)) {
          log.info(
            `[osquery-setup] Default output "${defaultOutput.id}" already points to ${dockerEsHost}`
          );
        } else if (defaultOutput.is_preconfigured) {
          log.info(
            `[osquery-setup] Default output "${defaultOutput.id}" is preconfigured with hosts=[${currentHosts}]. ` +
              `Ensure --serverConfigSet osquery is used so the preconfigured output points to the Docker-accessible ES host.`
          );
        } else {
          await kbnClient.request<FleetOutputMutationResponse>({
            method: 'PUT',
            path: `/api/fleet/outputs/${defaultOutput.id}`,
            body: { hosts: [dockerEsHost] },
          });
          log.info(`[osquery-setup] Updated output "${defaultOutput.id}" to ${dockerEsHost}`);
        }
      } else {
        log.info('[osquery-setup] No default output found, creating one...');
        await kbnClient.request<FleetOutputMutationResponse>({
          method: 'POST',
          path: '/api/fleet/outputs',
          body: {
            id: 'es-default-output',
            name: 'Default Output',
            type: 'elasticsearch',
            is_default: true,
            is_default_monitoring: true,
            hosts: [dockerEsHost],
          },
        });
        log.info('[osquery-setup] Fleet output created');
      }
    } catch (e: unknown) {
      log.info(`[osquery-setup] Fleet output configuration: ${errorMessage(e, 200)}`);
    }

    let serviceToken = '';
    let fleetServerPolicyId = '';

    if (isServerless) {
      log.info('[osquery-setup] Starting Fleet Server in standalone mode (serverless)...');

      const fleetServerArgs = getStandaloneFleetServerArgs({
        esUrl: config.hosts.elasticsearch,
      });

      const fleetServerContainer = await execa('docker', fleetServerArgs, {
        env: {
          ...process.env,
          ELASTICSEARCH_SERVICE_TOKEN: fleetServerDevServiceAccount.token,
        },
      });
      containerIds.push(fleetServerContainer.stdout.trim());
      log.info(
        `[osquery-setup] Fleet Server (standalone) started: ${fleetServerContainer.stdout.trim()}`
      );
    } else {
      log.info('[osquery-setup] Generating Fleet service token...');
      const { data: tokenResponse } = await kbnClient.request<FleetServiceTokenBody>({
        method: 'POST',
        path: '/api/fleet/service_tokens',
        body: {},
      });
      serviceToken = tokenResponse.value;
      log.info('[osquery-setup] Service token generated');

      log.info('[osquery-setup] Creating Fleet Server agent policy...');
      fleetServerPolicyId = await findOrCreateAgentPolicy(kbnClient, 'Fleet Server policy', {
        name: 'Fleet Server policy',
        description: '',
        namespace: 'default',
        monitoring_enabled: [],
        has_fleet_server: true,
      });
      log.info(`[osquery-setup] Fleet Server policy created: ${fleetServerPolicyId}`);

      log.info('[osquery-setup] Starting Fleet Server Docker container (managed)...');
      const fleetServerArgs = getManagedFleetServerArgs({
        esHost: `http://${host}:${esPort}`,
        policyId: fleetServerPolicyId,
        artifact: agentArtifact,
      });

      const fleetServerContainer = await execa('docker', fleetServerArgs, {
        env: { ...process.env, FLEET_SERVER_SERVICE_TOKEN: serviceToken },
      });
      containerIds.push(fleetServerContainer.stdout.trim());
      log.info(
        `[osquery-setup] Fleet Server (managed) started: ${fleetServerContainer.stdout.trim()}`
      );
    }

    log.info('[osquery-setup] Waiting for Fleet Server to become healthy...');
    const fleetServerHealthStart = Date.now();
    const fleetServerHealthTimeout = 60_000;
    let fleetServerReady = false;

    while (Date.now() - fleetServerHealthStart < fleetServerHealthTimeout) {
      try {
        const { stdout } = await execa('docker', [
          'inspect',
          '--format',
          '{{.State.Running}}',
          FLEET_SERVER_CONTAINER,
        ]);
        if (stdout.trim() !== 'true') {
          log.info('[osquery-setup] Fleet Server container not yet running, waiting 2s...');
          await new Promise((r) => setTimeout(r, 2_000));
          continue;
        }

        const result = await execa(
          'docker',
          [
            'exec',
            FLEET_SERVER_CONTAINER,
            'curl',
            '-sf',
            '--max-time',
            '2',
            'http://localhost:8220/api/status',
          ],
          { reject: false }
        );
        if (result.exitCode === 0) {
          fleetServerReady = true;
          log.info(
            `[osquery-setup] Fleet Server is healthy (${Math.round(
              (Date.now() - fleetServerHealthStart) / 1000
            )}s)`
          );
          break;
        }
      } catch {
        // Fleet status probe may fail while the service is still starting; retry.
      }

      await new Promise((r) => setTimeout(r, 2_000));
    }

    if (!fleetServerReady) {
      log.info(
        '[osquery-setup] Fleet Server health check timed out — proceeding anyway (agents may still connect)'
      );
    }

    // Agents in Docker need host.docker.internal to reach Fleet on the host.
    log.info('[osquery-setup] Registering Fleet Server host in Fleet settings...');
    try {
      await kbnClient.request<{ item: { id: string } }>({
        method: 'POST',
        path: '/api/fleet/fleet_server_hosts',
        body: {
          name: 'Scout Fleet Server',
          host_urls: [`https://${host}:8220`],
          is_default: true,
        },
      });
      log.info('[osquery-setup] Fleet Server host registered');
    } catch (e: unknown) {
      log.info(`[osquery-setup] Fleet Server host registration: ${errorMessage(e, 100)}`);
      try {
        const { data: hostsResponse } = await kbnClient.request<{
          items: Array<{ id: string; is_default: boolean }>;
        }>({
          method: 'GET',
          path: '/api/fleet/fleet_server_hosts',
        });
        const defaultHost = hostsResponse.items.find((h) => h.is_default);
        if (defaultHost) {
          await kbnClient.request<{ item: { id: string } }>({
            method: 'PUT',
            path: `/api/fleet/fleet_server_hosts/${defaultHost.id}`,
            body: {
              name: 'Scout Fleet Server',
              host_urls: [`https://${host}:8220`],
              is_default: true,
            },
          });
          log.info(
            '[osquery-setup] Updated existing Fleet Server host to use Docker-reachable URL'
          );
        }
      } catch (updateErr: unknown) {
        log.info(`[osquery-setup] Fleet Server host update: ${errorMessage(updateErr, 100)}`);
      }
    }

    log.info('[osquery-setup] Fetching osquery_manager version...');
    let osqueryVersion: string;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const { data: pkgResponse } = await kbnClient.request<{
          item: { version: string };
        }>({
          method: 'GET',
          path: '/api/fleet/epm/packages/osquery_manager',
        });
        osqueryVersion = pkgResponse.item.version;
        log.info(`[osquery-setup] osquery_manager version: ${osqueryVersion}`);
        break;
      } catch {
        if (attempt === 29) throw new Error('osquery_manager package not available after retries');
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }

    const policyNames = ['Default policy', 'Osquery policy'];
    const enrollmentKeys: string[] = [];

    for (const policyName of policyNames) {
      log.info(`[osquery-setup] Creating "${policyName}" agent policy...`);
      const policyId = await findOrCreateAgentPolicy(kbnClient, policyName, {
        name: policyName,
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        inactivity_timeout: 1209600,
      });
      log.info(`[osquery-setup] Created "${policyName}" policy: ${policyId}`);

      try {
        await kbnClient.request<CreatePackagePolicyResponse>({
          method: 'POST',
          path: '/api/fleet/package_policies',
          body: {
            policy_id: policyId,
            package: { name: 'osquery_manager', version: osqueryVersion! },
            name: `Policy for ${policyName}`,
            description: '',
            namespace: 'default',
            inputs: {
              'osquery_manager-osquery': { enabled: true, streams: {} },
            },
          },
        });
        log.info(`[osquery-setup] osquery_manager added to "${policyName}"`);
      } catch (e: unknown) {
        if (httpErrorStatus(e) === 409) {
          log.info(`[osquery-setup] osquery_manager already exists on "${policyName}"`);
        } else {
          throw e;
        }
      }

      const { data: keysResponse } = await kbnClient.request<{
        items: Array<{ api_key: string; policy_id: string }>;
      }>({
        method: 'GET',
        path: '/api/fleet/enrollment_api_keys',
        query: { kuery: `policy_id:${policyId}` },
      });

      const key = keysResponse.items.find((k) => k.policy_id === policyId);
      if (!key) throw new Error(`No enrollment key found for policy ${policyId}`);
      enrollmentKeys.push(key.api_key);
      log.info(`[osquery-setup] Enrollment key obtained for "${policyName}"`);
    }

    for (let i = 0; i < enrollmentKeys.length; i++) {
      const containerName = `${AGENT_CONTAINER_PREFIX}-${i}`;
      log.info(`[osquery-setup] Starting agent container: ${containerName}...`);

      const agentArgs = [
        'run',
        '--name',
        containerName,
        '--hostname',
        containerName,
        '--net',
        'elastic',
        '--detach',
        '--add-host',
        'host.docker.internal:host-gateway',
        '--env',
        'FLEET_ENROLL=1',
        '--env',
        `FLEET_URL=https://${host}:8220`,
        '--env',
        `FLEET_ENROLLMENT_TOKEN=${enrollmentKeys[i]}`,
        '--env',
        'FLEET_INSECURE=true',
        '--rm',
        agentArtifact,
      ];

      const agentContainer = await execa('docker', agentArgs);
      containerIds.push(agentContainer.stdout.trim());
      log.info(`[osquery-setup] Agent container started: ${agentContainer.stdout.trim()}`);
    }

    log.info('[osquery-setup] Waiting for agents to come online...');
    await waitForAgents(kbnClient, log, enrollmentKeys.length);

    log.info('[osquery-setup] Fleet setup complete. All agents online.');

    log.info('[osquery-setup] Warming up osquery on agents (submitting test query)...');
    await waitForOsqueryReady(kbnClient, log);

    log.info('[osquery-setup] Osquery warm-up complete. Agents are responsive.');
  }
);

// One-time sweep of orphaned scout-* packs/queries from crashed runs.
globalSetupHook(
  'Sweep orphaned scout-* osquery packs and saved queries',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  async ({ kbnClient, log }) => {
    log.info('[osquery-setup] Defensive sweep of orphaned scout-* packs / saved queries...');
    const osqueryApi = getOsqueryApiService({ kbnClient, log });
    await cleanOsqueryPacksByPrefix(osqueryApi, [...ALL_SCOUT_PACK_PREFIXES]);
    await cleanOsquerySavedQueriesByPrefix(osqueryApi, [...ALL_SCOUT_SAVED_QUERY_PREFIXES]);
    log.info('[osquery-setup] Defensive sweep complete.');
  }
);
