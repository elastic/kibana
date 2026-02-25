/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { globalSetupHook, tags } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';
import { maybeCreateDockerNetwork, verifyDockerInstalled } from '@kbn/es';
import { resolve } from 'path';
import {
  CA_TRUSTED_FINGERPRINT,
  FLEET_SERVER_CERT_PATH,
  FLEET_SERVER_KEY_PATH,
  fleetServerDevServiceAccount,
} from '@kbn/dev-utils';

const FLEET_SERVER_CONTAINER = 'scout-fleet-server';
const AGENT_CONTAINER_PREFIX = 'scout-osquery-agent';
const EXPECTED_AGENT_COUNT = 2;
const FLEET_SERVER_CUSTOM_CONFIG = resolve(__dirname, './fleet_server.yml');

// Track container IDs for cleanup on process exit
const containerIds: string[] = [];

function registerCleanup(log: { info: (msg: string) => void; error: (msg: string) => void }) {
  const cleanup = () => {
    for (const id of containerIds) {
      try {
        execa.sync('docker', ['kill', id]);
        log.info(`[osquery-teardown] Killed container ${id}`);
      } catch {
        // Container may already be stopped
      }
    }
  };

  // NOTE: Do NOT register on 'exit' — the global setup runs in a Playwright worker
  // process that exits after setup completes. Registering on 'exit' would kill the
  // Docker containers before the actual tests start running.
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
    const { data } = await kbnClient.request<any>({
      method: 'GET',
      path: '/api/fleet/agents',
      query: { perPage: 100 },
    });

    // Accept both 'online' and 'degraded' — the latter means the agent is running
    // but some non-critical components (e.g. monitoring exporters) have cert issues.
    // The osquery input is still functional in degraded state.
    return data.items.filter(
      (agent: { status: string }) => agent.status === 'online' || agent.status === 'degraded'
    ).length;
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
  } catch (e: any) {
    if (e?.response?.status === 409) {
      // Policy already exists — find it by name
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
  log: any,
  expectedCount: number,
  timeoutMs = 240_000
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

async function waitForOsqueryReady(kbnClient: KbnClient, log: any, timeoutMs = 300_000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      // Submit a simple live query
      const { data: queryResponse } = await kbnClient.request<any>({
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

      // Poll using the details endpoint to check query status
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 5_000));
        try {
          const { data: detailsResponse } = await kbnClient.request<any>({
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

            if (successful > 0 || docs > 0) {
              log.info(
                `[osquery-warmup] Osquery is ready! (successful=${successful}, docs=${docs})`
              );

              return;
            }
          }
        } catch (e: any) {
          log.info(`[osquery-warmup] Details check failed: ${e.message?.slice(0, 80)}`);
        }
      }

      log.info(
        `[osquery-warmup] No successful results yet (${Math.round(
          (Date.now() - start) / 1000
        )}s elapsed), submitting new query...`
      );
    } catch (e: any) {
      log.info(
        `[osquery-warmup] Query attempt failed (${e.message?.slice(0, 100)}), retrying in 10s...`
      );
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  log.info('[osquery-warmup] WARNING: Timed out waiting for osquery to respond. Tests may fail.');
}

// ── Fleet Server Docker arg builders ──────────────────────────────────────────

/**
 * Build Docker args for Fleet Server in managed mode (stateful / ESS).
 * Uses a Kibana-issued service token and a Fleet Server agent policy.
 */
function getManagedFleetServerArgs({
  esHost,
  serviceToken,
  policyId,
  artifact,
}: {
  esHost: string;
  serviceToken: string;
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
    `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,
    '--env',
    `FLEET_SERVER_POLICY=${policyId}`,
    '--rm',
    artifact,
  ];
}

/**
 * Build Docker args for Fleet Server in standalone mode (serverless).
 * Uses the dev service account token, cert/key mounts, and a custom config file.
 * The ES hostname is rewritten to the first serverless Docker node (es01)
 * so that traffic stays inside the `elastic` Docker network.
 */
function getStandaloneFleetServerArgs({ esUrl }: { esUrl: string }): string[] {
  // Rewrite hostname to the first serverless ES node so Fleet Server connects
  // via the Docker network rather than host.docker.internal (which is unreachable
  // because serverless ES only binds to 127.0.0.1 on the host).
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
    `ELASTICSEARCH_SERVICE_TOKEN=${fleetServerDevServiceAccount.token}`,
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
    // The standalone Fleet Server image uses `latest` tag (unlike elastic-agent which
    // requires a specific version). This mirrors the behavior in @kbn/security-solution-plugin.
    `docker.elastic.co/observability-ci/fleet-server:latest`,
  ];
}

// ── Global setup hook ─────────────────────────────────────────────────────────

// Set the timeout for the entire global setup (10 minutes — includes osquery warm-up)
globalSetupHook.setTimeout(10 * 60 * 1000);

globalSetupHook(
  'Set up Fleet Server and Elastic Agents for Osquery tests',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.security.complete,
      ...tags.serverless.security.essentials,
    ],
  },
  async ({ kbnClient, log, config }) => {
    const isServerless = config.serverless;

    // ── 0. Check if Docker is available ────────────────────────────────
    // Essentials tier tests only check PLI permissions and don't need agents.
    // Their CI script skips Docker entirely, so we detect this and skip provisioning.
    try {
      await verifyDockerInstalled(log);
    } catch {
      log.info(
        '[osquery-setup] Docker is not available — skipping Fleet Server and agent provisioning. ' +
          'Tests that require live agents will be filtered out by tag.'
      );

      return;
    }

    // Register container cleanup handler early
    registerCleanup(log);

    // ── 0. Check if infrastructure is already running ───────────────────
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

      // Still verify osquery is responsive before proceeding
      log.info('[osquery-setup] Verifying osquery is responsive on existing agents...');
      await waitForOsqueryReady(kbnClient, log);
      log.info('[osquery-setup] Osquery warm-up complete. Agents are responsive.');

      return;
    }

    log.info('[osquery-setup] Infrastructure not fully running — provisioning from scratch.');

    // ── 1. Verify Docker is available ──────────────────────────────────
    const agentVersion = await getAgentVersion(kbnClient);
    const agentArtifact = `docker.elastic.co/elastic-agent/elastic-agent:${agentVersion}`;
    const esUrl = new URL(config.hosts.elasticsearch);
    const esPort = esUrl.port || '9220';
    const host = 'host.docker.internal';

    log.info(`[osquery-setup] Mode: ${isServerless ? 'serverless' : 'stateful'}`);
    log.info(`[osquery-setup] Agent version: ${agentVersion}`);
    log.info(`[osquery-setup] ES URL: ${config.hosts.elasticsearch}`);

    await maybeCreateDockerNetwork(log);

    // ── 2. Clean up any stale containers ────────────────────────────────
    log.info('[osquery-setup] Cleaning up stale containers...');
    await execa('docker', ['rm', '-f', FLEET_SERVER_CONTAINER]).catch(() => {});
    for (let i = 0; i < EXPECTED_AGENT_COUNT; i++) {
      await execa('docker', ['rm', '-f', `${AGENT_CONTAINER_PREFIX}-${i}`]).catch(() => {});
    }

    // ── 3. Fleet setup ─────────────────────────────────────────────────
    log.info('[osquery-setup] Calling Fleet setup...');
    await kbnClient.request<any>({ method: 'POST', path: '/api/fleet/setup' });
    log.info('[osquery-setup] Fleet setup complete');

    // ── 3b. Configure Fleet default output to point to ES on the Docker-accessible host
    const dockerEsHost = `http://${host}:${esPort}`;
    log.info(`[osquery-setup] Configuring Fleet default output to ${dockerEsHost}...`);
    try {
      // List existing outputs and find the default one
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
          await kbnClient.request<any>({
            method: 'PUT',
            path: `/api/fleet/outputs/${defaultOutput.id}`,
            body: { hosts: [dockerEsHost] },
          });
          log.info(`[osquery-setup] Updated output "${defaultOutput.id}" to ${dockerEsHost}`);
        }
      } else {
        log.info('[osquery-setup] No default output found, creating one...');
        await kbnClient.request<any>({
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
    } catch (e: any) {
      log.info(`[osquery-setup] Fleet output configuration: ${e?.message?.slice(0, 200) || e}`);
    }

    // ── 4–6. Start Fleet Server ────────────────────────────────────────
    let serviceToken = '';
    let fleetServerPolicyId = '';

    if (isServerless) {
      // ── Serverless: standalone Fleet Server ──────────────────────────
      log.info('[osquery-setup] Starting Fleet Server in standalone mode (serverless)...');

      const fleetServerArgs = getStandaloneFleetServerArgs({
        esUrl: config.hosts.elasticsearch,
      });

      const fleetServerContainer = await execa('docker', fleetServerArgs);
      containerIds.push(fleetServerContainer.stdout.trim());
      log.info(
        `[osquery-setup] Fleet Server (standalone) started: ${fleetServerContainer.stdout.trim()}`
      );
    } else {
      // ── Stateful: managed Fleet Server ───────────────────────────────
      log.info('[osquery-setup] Generating Fleet service token...');
      const { data: tokenResponse } = await kbnClient.request<any>({
        method: 'POST',
        path: '/api/fleet/service_tokens',
        body: {},
      });
      serviceToken = (tokenResponse as any).value;
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
        serviceToken,
        policyId: fleetServerPolicyId,
        artifact: agentArtifact,
      });

      const fleetServerContainer = await execa('docker', fleetServerArgs);
      containerIds.push(fleetServerContainer.stdout.trim());
      log.info(
        `[osquery-setup] Fleet Server (managed) started: ${fleetServerContainer.stdout.trim()}`
      );
    }

    // Wait for Fleet Server to become healthy (poll instead of fixed sleep)
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
        // Container might not be ready yet
      }

      await new Promise((r) => setTimeout(r, 2_000));
    }

    if (!fleetServerReady) {
      log.info(
        '[osquery-setup] Fleet Server health check timed out — proceeding anyway (agents may still connect)'
      );
    }

    // ── 7. Update Fleet Server host URL in Fleet settings ──────────────
    // Both stateful and serverless agents run inside Docker containers where
    // `localhost` refers to the container itself. Register the host URL using
    // `host.docker.internal` so that agents can reach Fleet Server on the host.
    log.info('[osquery-setup] Registering Fleet Server host in Fleet settings...');
    try {
      await kbnClient.request<any>({
        method: 'POST',
        path: '/api/fleet/fleet_server_hosts',
        body: {
          name: 'Scout Fleet Server',
          host_urls: [`https://${host}:8220`],
          is_default: true,
        },
      });
      log.info('[osquery-setup] Fleet Server host registered');
    } catch (e: any) {
      // May already exist — try updating the default host instead
      log.info(`[osquery-setup] Fleet Server host registration: ${e.message?.slice(0, 100)}`);
      try {
        const { data: hostsResponse } = await kbnClient.request<{
          items: Array<{ id: string; is_default: boolean }>;
        }>({
          method: 'GET',
          path: '/api/fleet/fleet_server_hosts',
        });
        const defaultHost = hostsResponse.items.find((h) => h.is_default);
        if (defaultHost) {
          await kbnClient.request<any>({
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
      } catch (updateErr: any) {
        log.info(`[osquery-setup] Fleet Server host update: ${updateErr.message?.slice(0, 100)}`);
      }
    }

    // ── 8. Get osquery_manager version (pre-installed by server config) ─
    log.info('[osquery-setup] Fetching osquery_manager version...');
    let osqueryVersion: string;
    // Retry because the pre-install may still be in progress
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

    // ── 9. Create agent policies with osquery integration ──────────────
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

      // Add osquery_manager integration (ignore 409 if already added)
      try {
        await kbnClient.request<any>({
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
      } catch (e: any) {
        if (e?.response?.status === 409) {
          log.info(`[osquery-setup] osquery_manager already exists on "${policyName}"`);
        } else {
          throw e;
        }
      }

      // Get enrollment key
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

    // ── 10. Start Elastic Agent containers ─────────────────────────────
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

    // ── 11. Wait for all agents to come online ─────────────────────────
    log.info('[osquery-setup] Waiting for agents to come online...');
    await waitForAgents(kbnClient, log, enrollmentKeys.length);

    log.info('[osquery-setup] Fleet setup complete. All agents online.');

    // ── 12. Wait for osquery to be responsive on agents ────────────────
    log.info('[osquery-setup] Warming up osquery on agents (submitting test query)...');
    await waitForOsqueryReady(kbnClient, log);

    log.info('[osquery-setup] Osquery warm-up complete. Agents are responsive.');
  }
);
