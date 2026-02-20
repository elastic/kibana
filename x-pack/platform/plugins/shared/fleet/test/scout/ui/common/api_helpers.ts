/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * API helpers for Fleet Scout tests.
 * Functions to create/delete agent policies, enrollment tokens, download sources,
 * insert/delete ES docs, install/uninstall test packages, etc.
 */

function randomString(length = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

export async function createAgentPolicy(
  kbnClient: any,
  name: string,
  options?: {
    id?: string;
    namespace?: string;
    description?: string;
    monitoring_enabled?: string[];
    download_source_id?: string;
    has_fleet_server?: boolean;
  }
): Promise<any> {
  const body = {
    name,
    namespace: options?.namespace ?? 'default',
    description: options?.description ?? '',
    monitoring_enabled: options?.monitoring_enabled ?? ['logs', 'metrics'],
    ...(options?.id && { id: options.id }),
    ...(options?.download_source_id && { download_source_id: options.download_source_id }),
    ...(options?.has_fleet_server !== undefined && { has_fleet_server: options.has_fleet_server }),
  };

  const response = await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/agent_policies',
    body,
  });

  return response.data?.item ?? response.item;
}

export async function deleteAgentPolicy(
  kbnClient: any,
  id: string,
  spaceId?: string
): Promise<void> {
  try {
    const path = spaceId
      ? `/s/${spaceId}/api/fleet/agent_policies/delete`
      : '/api/fleet/agent_policies/delete';
    await kbnClient.request({
      method: 'POST',
      path,
      body: { agentPolicyId: id },
    });
  } catch {
    // Ignore — may already be deleted
  }
}

export async function cleanupAgentPolicies(kbnClient: any, spaceId?: string): Promise<void> {
  try {
    const path = spaceId
      ? `/s/${spaceId}/api/fleet/agent_policies?withAgentCount=true`
      : '/api/fleet/agent_policies?withAgentCount=true';
    const response = await kbnClient.request({ method: 'GET', path });
    const items = response.data?.items ?? response.items ?? [];
    const toDelete = items.filter((p: any) => (p.agents ?? 0) === 0);

    for (const policy of toDelete) {
      await deleteAgentPolicy(kbnClient, policy.id, spaceId);
    }
  } catch {
    // Ignore cleanup failures
  }
}

export async function createDownloadSource(
  kbnClient: any,
  payload: { name: string; host: string; id?: string; is_default?: boolean }
): Promise<any> {
  const response = await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/agent_download_sources',
    body: payload,
  });

  return response.data?.item ?? response.item;
}

export async function cleanupDownloadSources(kbnClient: any): Promise<void> {
  try {
    const response = await kbnClient.request({
      method: 'GET',
      path: '/api/fleet/agent_download_sources',
    });
    const items = response.data?.items ?? response.items ?? [];
    const nonDefault = items.filter((ds: any) => !ds.is_default);

    for (const ds of nonDefault) {
      try {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/fleet/agent_download_sources/${ds.id}`,
        });
      } catch {
        // Ignore
      }
    }
  } catch {
    // Ignore cleanup failures
  }
}

export async function insertDoc(
  esClient: any,
  index: string,
  doc: any,
  id?: string
): Promise<void> {
  await esClient.index({
    index,
    document: doc,
    ...(id && { id }),
    refresh: 'wait_for',
  });
}

export async function insertDocs(esClient: any, index: string, docs: any[]): Promise<void> {
  const operations = docs.flatMap((doc) => [{ index: { _index: index } }, doc]);
  await esClient.bulk({ operations, refresh: 'wait_for' });
}

export async function deleteDocsByQuery(
  esClient: any,
  index: string,
  query: any,
  options?: { ignoreUnavailable?: boolean }
): Promise<void> {
  try {
    await esClient.deleteByQuery({
      index,
      query,
      ignore_unavailable: options?.ignoreUnavailable ?? false,
      allow_no_indices: true,
      refresh: true,
      conflicts: 'proceed',
    });
  } catch {
    // Ignore
  }
}

export async function installTestPackage(
  kbnClient: any,
  pkgName: string,
  version: string = 'latest'
): Promise<any> {
  // Fleet EPM install: POST /api/fleet/epm/packages/{name}/{version}
  const path =
    version === 'latest'
      ? `/api/fleet/epm/packages/${pkgName}`
      : `/api/fleet/epm/packages/${pkgName}/${version}`;
  const response = await kbnClient.request({
    method: 'POST',
    path,
    body: version === 'latest' ? undefined : {},
  });

  return response.data ?? response;
}

/**
 * Install a test package from a zip file (Fleet Cypress test packages).
 * Zip path: fleet plugin root / cypress / packages / {pkgName}.zip
 */
export async function installTestPackageFromZip(
  kbnClient: any,
  pkgName: string,
  zipPath?: string
): Promise<any> {
  const pathModule = await import('path');
  const fs = await import('fs').then((m) => m.promises);
  const resolvedPath =
    zipPath ?? pathModule.resolve(__dirname, '../../../../cypress/packages', `${pkgName}.zip`);
  const zipContent = await fs.readFile(resolvedPath);
  const response = await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/epm/packages',
    body: zipContent,
    headers: { 'Content-Type': 'application/zip' },
  });

  return response.data ?? response;
}

export async function uninstallTestPackage(
  kbnClient: any,
  pkgName: string,
  version?: string
): Promise<void> {
  try {
    const path = version
      ? `/api/fleet/epm/packages/${pkgName}/${version}`
      : `/api/fleet/epm/packages/${pkgName}`;
    await kbnClient.request({
      method: 'DELETE',
      path,
    });
  } catch {
    // Ignore — may already be uninstalled
  }
}

export async function setFleetServerHost(
  kbnClient: any,
  host: string = 'https://fleetserver:8220'
): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/fleet_server_hosts',
    body: {
      name: 'Default host',
      host_urls: [host],
      is_default: true,
    },
  });
}

export function createAgentDoc(
  id: string,
  policyId: string,
  status: string = 'online',
  version: string = '8.1.0',
  data?: Record<string, unknown>
): Record<string, unknown> {
  return {
    access_api_key_id: 'abcdefghijklmn',
    action_seq_no: [-1],
    active: true,
    agent: { id, version },
    enrolled_at: new Date().toISOString(),
    local_metadata: {
      elastic: {
        agent: {
          'build.original': version,
          id,
          log_level: 'info',
          snapshot: true,
          upgradeable: status !== 'online',
          version,
        },
      },
      host: {
        architecture: 'x86_64',
        hostname: id,
        id: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
        ip: ['127.0.0.1/8'],
        mac: ['ab:cd:12:34:56:78'],
        name: id,
      },
      os: {
        family: 'darwin',
        full: 'Mac OS X(10.16)',
        kernel: '21.3.0',
        name: 'Mac OS X',
        platform: 'darwin',
        version: '10.16',
      },
    },
    policy_id: policyId,
    type: 'PERMANENT',
    default_api_key: 'abcdefg',
    default_api_key_id: 'abcd',
    policy_output_permissions_hash: 'somehash',
    updated_at: '2022-03-07T16:35:03Z',
    last_checkin_status: status,
    last_checkin: new Date().toISOString(),
    policy_revision_idx: 1,
    policy_coordinator_idx: 1,
    policy_revision: 1,
    status,
    packages: [],
    ...data,
  };
}

export async function setupFleetServer(
  kbnClient: any,
  esClient: any,
  kibanaVersion: string = '8.1.0'
): Promise<string> {
  const FLEET_SERVER_POLICY_ID = 'fleet-server-policy';

  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/agent_policies',
      body: {
        id: FLEET_SERVER_POLICY_ID,
        name: 'Fleet Server policy',
        namespace: 'default',
        has_fleet_server: true,
      },
    });
  } catch (e: any) {
    if (e?.response?.status !== 409) {
      throw e;
    }
  }

  const agentDoc = createAgentDoc('fleet-server', FLEET_SERVER_POLICY_ID, 'online', kibanaVersion);
  await insertDocs(esClient, '.fleet-agents', [agentDoc]);
  await setFleetServerHost(kbnClient);

  return FLEET_SERVER_POLICY_ID;
}

export async function createEnrollmentToken(
  kbnClient: any,
  policyId: string,
  name?: string
): Promise<any> {
  const response = await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/enrollment_api_keys',
    body: {
      policy_id: policyId,
      name: name ?? `Token ${randomString()}`,
    },
  });

  return response.data?.item ?? response.item;
}

export async function enableSpaceAwareness(kbnClient: any): Promise<void> {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/internal/fleet/enable_space_awareness',
    });
  } catch {
    // May already be enabled
  }
}

export async function createSpace(
  kbnClient: any,
  id: string,
  name: string,
  options?: { description?: string; color?: string; initials?: string }
): Promise<any> {
  const body = {
    id,
    name,
    description: options?.description ?? 'Test space',
    color: options?.color ?? '#aabbcc',
    initials: options?.initials ?? 'TE',
    disabledFeatures: [],
    imageUrl: undefined,
  };

  const response = await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/space',
    body,
  });

  return response.data ?? response;
}

export async function unenrollAgents(kbnClient: any): Promise<void> {
  try {
    const response = await kbnClient.request({
      method: 'GET',
      path: '/api/fleet/agents?page=1&perPage=100&showInactive=false&showUpgradeable=false',
    });
    const items = response.data?.items ?? response.items ?? [];

    for (const agent of items) {
      try {
        await kbnClient.request({
          method: 'POST',
          path: `/api/fleet/agents/${agent.id}/unenroll`,
          body: { revoke: true },
        });
      } catch {
        // Ignore
      }
    }
  } catch {
    // Ignore
  }
}
