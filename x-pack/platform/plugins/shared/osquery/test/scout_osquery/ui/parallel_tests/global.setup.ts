/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAxiosResponseError } from '@kbn/dev-utils';
import { KbnClientRequesterError } from '@kbn/kbn-client';
import type { CreatePackagePolicyResponse, PostFleetSetupResponse } from '@kbn/fleet-plugin/common';
import { globalSetupHook, tags } from '@kbn/scout';
import type { KbnClient } from '@kbn/scout';

/**
 * Tier-A global setup: install the `osquery_manager` integration on the Default
 * and Osquery agent policies so the UI renders (live query form, saved queries
 * list, packs table all depend on the integration being installed).
 *
 * No Docker, no Fleet Server, no Elastic Agent containers — those live in
 * `real_agent_tests/global.setup.ts` for Tier-B.
 *
 * Idempotent: every step handles 409 Conflict / pre-existing state so reruns
 * against the same dev server work.
 */

interface SetupLog {
  info: (msg: string) => void;
}

function httpErrorStatus(caught: unknown): number | undefined {
  if (isAxiosResponseError(caught)) {
    return caught.response?.status;
  }

  if (caught instanceof KbnClientRequesterError) {
    return caught.axiosError?.status;
  }

  return undefined;
}

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

async function installOsqueryManagerOnPolicy(
  kbnClient: KbnClient,
  log: SetupLog,
  policyId: string,
  policyName: string,
  osqueryVersion: string
): Promise<void> {
  try {
    await kbnClient.request<CreatePackagePolicyResponse>({
      method: 'POST',
      path: '/api/fleet/package_policies',
      body: {
        policy_id: policyId,
        package: { name: 'osquery_manager', version: osqueryVersion },
        name: `Policy for ${policyName}`,
        description: '',
        namespace: 'default',
        inputs: {
          'osquery_manager-osquery': { enabled: true, streams: {} },
        },
      },
    });
    log.info(`[osquery-tier-a] osquery_manager added to "${policyName}"`);
  } catch (e: unknown) {
    if (httpErrorStatus(e) === 409) {
      log.info(`[osquery-tier-a] osquery_manager already exists on "${policyName}"`);

      return;
    }

    throw e;
  }
}

globalSetupHook(
  'Install osquery_manager integration for Tier-A osquery Scout tests',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  async ({ kbnClient, log }) => {
    log.info('[osquery-tier-a] Calling Fleet setup...');
    await kbnClient.request<PostFleetSetupResponse>({ method: 'POST', path: '/api/fleet/setup' });

    log.info('[osquery-tier-a] Fetching osquery_manager package version...');
    let osqueryVersion: string | undefined;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const { data: pkgResponse } = await kbnClient.request<{
          item: { version: string };
        }>({
          method: 'GET',
          path: '/api/fleet/epm/packages/osquery_manager',
        });
        osqueryVersion = pkgResponse.item.version;
        log.info(`[osquery-tier-a] osquery_manager version: ${osqueryVersion}`);
        break;
      } catch {
        if (attempt === 29) {
          throw new Error('osquery_manager package not available after 30 retries');
        }

        await new Promise((r) => setTimeout(r, 5_000));
      }
    }

    for (const policyName of ['Default policy', 'Osquery policy']) {
      log.info(`[osquery-tier-a] Ensuring "${policyName}" agent policy exists...`);
      const policyId = await findOrCreateAgentPolicy(kbnClient, policyName, {
        name: policyName,
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        inactivity_timeout: 1209600,
      });
      log.info(`[osquery-tier-a] "${policyName}" policy id: ${policyId}`);

      await installOsqueryManagerOnPolicy(kbnClient, log, policyId, policyName, osqueryVersion!);
    }

    log.info('[osquery-tier-a] Setup complete — Tier-A specs may now run.');
  }
);
