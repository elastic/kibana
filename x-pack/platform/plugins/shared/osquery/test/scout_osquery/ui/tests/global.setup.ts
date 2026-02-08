/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { globalSetupHook } from '@kbn/scout';
import { maybeCreateDockerNetwork, verifyDockerInstalled } from '@kbn/es';

const FLEET_SERVER_CONTAINER = 'scout-fleet-server';
const AGENT_CONTAINER_PREFIX = 'scout-osquery-agent';
const EXPECTED_AGENT_COUNT = 2;

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

async function getOnlineAgentCount(kbnClient: any): Promise<number> {
  try {
    const { data } = await kbnClient.request({
      method: 'GET',
      path: '/api/fleet/agents',
      query: { perPage: 100 },
    });

    return data.items.filter((agent: { status: string }) => agent.status === 'online').length;
  } catch {
    return 0;
  }
}

async function getAgentVersion(kbnClient: any): Promise<string> {
  try {
    const status = await kbnClient.status.get();

    return `${status.version.number}-SNAPSHOT`;
  } catch {
    return '9.4.0-SNAPSHOT';
  }
}

async function waitForAgents(kbnClient: any, log: any, expectedCount: number, timeoutMs = 240_000) {
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

async function waitForOsqueryReady(kbnClient: any, log: any, timeoutMs = 300_000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      // Submit a simple live query
      const { data: queryResponse } = await kbnClient.request({
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
          const { data: detailsResponse } = await kbnClient.request({
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

// Set the timeout for the entire global setup (10 minutes — includes osquery warm-up)
globalSetupHook.setTimeout(10 * 60 * 1000);

globalSetupHook(
  'Set up Fleet Server and Elastic Agents for Osquery tests',
  { tag: ['@ess'] },
  async ({ kbnClient, log, config }) => {
    // Docker-based Fleet Server and Elastic Agent provisioning is only applicable in
    // stateful (ESS) mode. In serverless mode, skip this setup entirely.
    if (config.serverless) {
      log.info(
        '[osquery-setup] Serverless mode detected — skipping Docker-based Fleet/Agent provisioning.'
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
    const artifact = `docker.elastic.co/elastic-agent/elastic-agent:${agentVersion}`;
    const esUrl = new URL(config.hosts.elasticsearch);
    const esPort = esUrl.port || '9220';
    const host = 'host.docker.internal';

    log.info(`[osquery-setup] Agent version: ${agentVersion}`);
    log.info(`[osquery-setup] ES port: ${esPort}`);

    await verifyDockerInstalled(log);
    await maybeCreateDockerNetwork(log);

    // ── 2. Clean up any stale containers ────────────────────────────────
    log.info('[osquery-setup] Cleaning up stale containers...');
    await execa('docker', ['rm', '-f', FLEET_SERVER_CONTAINER]).catch(() => {});
    for (let i = 0; i < EXPECTED_AGENT_COUNT; i++) {
      await execa('docker', ['rm', '-f', `${AGENT_CONTAINER_PREFIX}-${i}`]).catch(() => {});
    }

    // ── 3. Fleet setup ─────────────────────────────────────────────────
    log.info('[osquery-setup] Calling Fleet setup...');
    await kbnClient.request({ method: 'POST', path: '/api/fleet/setup' });
    log.info('[osquery-setup] Fleet setup complete');

    // ── 4. Generate a service token for Fleet Server ───────────────────
    log.info('[osquery-setup] Generating Fleet service token...');
    const { data: tokenResponse } = await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/service_tokens',
      body: {},
    });
    const serviceToken = (tokenResponse as any).value;
    log.info('[osquery-setup] Service token generated');

    // ── 5. Create Fleet Server agent policy ────────────────────────────
    log.info('[osquery-setup] Creating Fleet Server agent policy...');
    const { data: fleetServerPolicyResponse } = await kbnClient.request<{
      item: { id: string };
    }>({
      method: 'POST',
      path: '/api/fleet/agent_policies',
      body: {
        name: 'Fleet Server policy',
        description: '',
        namespace: 'default',
        monitoring_enabled: [],
        has_fleet_server: true,
      },
    });
    const fleetServerPolicyId = fleetServerPolicyResponse.item.id;
    log.info(`[osquery-setup] Fleet Server policy created: ${fleetServerPolicyId}`);

    // ── 6. Start Fleet Server Docker container ─────────────────────────
    log.info('[osquery-setup] Starting Fleet Server Docker container...');

    const fleetServerArgs = [
      'run',
      '--name',
      FLEET_SERVER_CONTAINER,
      '--net',
      'elastic',
      '--detach',
      '-p',
      '8220:8220',
      '--add-host',
      'host.docker.internal:host-gateway',
      '--env',
      'FLEET_SERVER_ENABLE=true',
      '--env',
      `FLEET_SERVER_ELASTICSEARCH_HOST=http://${host}:${esPort}`,
      '--env',
      `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,
      '--env',
      `FLEET_SERVER_POLICY=${fleetServerPolicyId}`,
      '--rm',
      artifact,
    ];

    const fleetServerContainer = await execa('docker', fleetServerArgs);
    containerIds.push(fleetServerContainer.stdout.trim());
    log.info(
      `[osquery-setup] Fleet Server container started: ${fleetServerContainer.stdout.trim()}`
    );

    // Give Fleet Server time to initialize
    log.info('[osquery-setup] Waiting 20s for Fleet Server to initialize...');
    await new Promise((r) => setTimeout(r, 20_000));

    // ── 7. Get osquery_manager version (pre-installed by server config) ─
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

    // ── 8. Create agent policies with osquery integration ──────────────
    const policyNames = ['Default policy', 'Osquery policy'];
    const enrollmentKeys: string[] = [];

    for (const policyName of policyNames) {
      log.info(`[osquery-setup] Creating "${policyName}" agent policy...`);
      const { data: policyResponse } = await kbnClient.request<{
        item: { id: string };
      }>({
        method: 'POST',
        path: '/api/fleet/agent_policies?sys_monitoring=true',
        body: {
          name: policyName,
          description: '',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          inactivity_timeout: 1209600,
        },
      });
      const policyId = policyResponse.item.id;
      log.info(`[osquery-setup] Created "${policyName}" policy: ${policyId}`);

      // Add osquery_manager integration
      await kbnClient.request({
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

    // ── 9. Start Elastic Agent containers ──────────────────────────────
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
        artifact,
      ];

      const agentContainer = await execa('docker', agentArgs);
      containerIds.push(agentContainer.stdout.trim());
      log.info(`[osquery-setup] Agent container started: ${agentContainer.stdout.trim()}`);
    }

    // ── 10. Wait for all agents to come online ──────────────────────────
    log.info('[osquery-setup] Waiting for agents to come online...');
    await waitForAgents(kbnClient, log, enrollmentKeys.length);

    log.info('[osquery-setup] Fleet setup complete. All agents online.');

    // ── 11. Wait for osquery to be responsive on agents ────────────────
    log.info('[osquery-setup] Warming up osquery on agents (submitting test query)...');
    await waitForOsqueryReady(kbnClient, log);

    log.info('[osquery-setup] Osquery warm-up complete. Agents are responsive.');
  }
);
