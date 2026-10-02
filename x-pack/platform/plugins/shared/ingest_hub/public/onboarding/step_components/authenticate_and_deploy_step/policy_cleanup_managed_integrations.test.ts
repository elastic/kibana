/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendDeleteAgentlessPolicy: jest.fn(),
  sendUpdateAgentlessPolicy: jest.fn(),
  sendGetPackageInfoByKey: jest.fn(),
  sendGetAgentlessPolicy: jest.fn(),
}));

import {
  sendDeleteAgentlessPolicy,
  sendUpdateAgentlessPolicy,
  sendGetPackageInfoByKey,
  sendGetAgentlessPolicy,
} from '@kbn/fleet-plugin/public';

import { cleanupManagedIntegrationsPolicies } from './policy_cleanup_managed_integrations';
import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const mockDeleteAgentless = sendDeleteAgentlessPolicy as jest.Mock;
const mockUpdateAgentless = sendUpdateAgentlessPolicy as jest.Mock;
const mockGetPackageInfo = sendGetPackageInfoByKey as jest.Mock;
const mockGetAgentlessPolicy = sendGetAgentlessPolicy as jest.Mock;

function makeInstance(instanceId: string, serviceId: string = instanceId): ServiceInstance {
  return { instanceId, serviceId, name: `AWS ${serviceId}`, isDuplicate: false };
}

function makeService(id: string, packageName = 'aws'): AwsServiceMatrixEntry {
  return {
    id,
    name: `AWS ${id}`,
    packageName,
    dataStreams: [id],
    inputs: ['aws-s3'],
    showInUI: true,
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    varDefsByInput: {},
    varDefsByDataStream: {},
  } as unknown as AwsServiceMatrixEntry;
}

const BASE_OPTS = {
  namespace: 'default',
  globalRegion: 'us-east-1',
  storedServiceVars: {},
  authenticateAndDeployStep: {} as never,
  instances: [] as ServiceInstance[],
  servicesMap: new Map<string, AwsServiceMatrixEntry>(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPackageInfo.mockResolvedValue({ data: { item: { version: '3.0.0', vars: [] } } });
  mockGetAgentlessPolicy.mockResolvedValue({
    item: { name: 'existing-agentless-name', package: { version: '2.5.0' } },
  });
  mockDeleteAgentless.mockResolvedValue({});
  mockUpdateAgentless.mockResolvedValue({});
});

// ── cleanupManagedIntegrationsPolicies ───────────────────────────────────────

describe('cleanupManagedIntegrationsPolicies', () => {
  it('makes no Fleet calls and returns empty ops when pending is empty', async () => {
    const ops = await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: {},
      currentPolicyIdsByInstance: {},
    });
    expect(mockDeleteAgentless).not.toHaveBeenCalled();
    expect(mockUpdateAgentless).not.toHaveBeenCalled();
    expect(ops).toEqual({ toDelete: [], toUpdate: [] });
  });

  it('calls sendDeleteAgentlessPolicy for each policy in toDelete', async () => {
    const ops = await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1', 'inst-b': 'policy-2' },
      currentPolicyIdsByInstance: {},
    });
    expect(mockDeleteAgentless).toHaveBeenCalledWith('policy-1');
    expect(mockDeleteAgentless).toHaveBeenCalledWith('policy-2');
    expect(ops.toDelete).toContain('policy-1');
    expect(ops.toDelete).toContain('policy-2');
  });

  it('returns the ops object', async () => {
    const ops = await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: {},
    });
    expect(ops).toHaveProperty('toDelete');
    expect(ops).toHaveProperty('toUpdate');
  });

  it('swallows individual delete failures and does not include them in returned ops', async () => {
    mockDeleteAgentless.mockRejectedValue(new Error('Fleet 500'));
    const ops = await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: {},
    });
    // Failed op not in returned succeeded ops.
    expect(ops.toDelete).not.toContain('policy-1');
  });

  it('calls sendGetPackageInfoByKey when toUpdate has entries and surviving members resolve', async () => {
    const instance = makeInstance('inst-b', 'vpcflow');
    const service = makeService('vpcflow');
    await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', service]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    expect(mockGetPackageInfo).toHaveBeenCalledWith('aws', '2.5.0');
  });

  it('swallows individual update failures and does not include them in returned ops', async () => {
    const instance = makeInstance('inst-b', 'vpcflow');
    const service = makeService('vpcflow');
    mockGetPackageInfo.mockRejectedValue(new Error('pkg fetch failed'));
    const ops = await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', service]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    // Failed update not in returned succeeded ops.
    expect(ops.toUpdate).toHaveLength(0);
  });
});

// ── updateManagedIntegrationsPolicy — payload shape ──────────────────────────

describe('updateManagedIntegrationsPolicy — payload shape', () => {
  const vpcflow = makeService('vpcflow');
  const instance = makeInstance('inst-b', 'vpcflow');

  it('sends correct package name, version, and preserves existing policy name', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    const payload = mockUpdateAgentless.mock.calls[0][1];
    expect(payload.package).toEqual({ name: 'aws', version: '2.5.0' });
    expect(payload.namespace).toBe('default');
    // Name preserved from existing policy (not regenerated with a timestamp).
    expect(payload.name).toBe('existing-agentless-name');
  });

  it('includes enabled input for the surviving service', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    const payload = mockUpdateAgentless.mock.calls[0][1];
    // buildPackageInputs produces key '<serviceId>-<inputType>'
    expect(payload.inputs['vpcflow-aws-s3']).toBeDefined();
    expect(payload.inputs['vpcflow-aws-s3'].enabled).toBe(true);
  });

  it('disables unrelated policy_template inputs not in surviving services', async () => {
    // unrelated_svc is in the package policy_templates but not in surviving members.
    // The disable loop must add it as enabled: false.
    mockGetPackageInfo.mockResolvedValue({
      data: {
        item: {
          version: '2.5.0',
          vars: [],
          policy_templates: [{ name: 'unrelated_svc', input: 'httpjson' }],
        },
      },
    });
    await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    const payload = mockUpdateAgentless.mock.calls[0][1];
    expect(payload.inputs['unrelated_svc-httpjson']).toEqual({ enabled: false, streams: {} });
  });

  it('includes static-key vars when authenticateAndDeployStep has staticKeys', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: {
        item: {
          version: '2.5.0',
          vars: [{ name: 'access_key_id' }, { name: 'secret_access_key' }],
          policy_templates: [],
        },
      },
    });
    await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      authenticateAndDeployStep: {
        staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' },
      } as never,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    const payload = mockUpdateAgentless.mock.calls[0][1];
    expect(payload.vars?.access_key_id).toBe('AKID');
    expect(payload.vars?.secret_access_key).toBe('SECRET');
  });

  it('preserves cloud_connector from the fetched policy (not from session connectorId)', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    // Simulate a policy whose connector was reassigned by a Fleet operator since onboarding.
    // The cleanup PUT must echo back the connector that is already on the policy, not rebuild
    // it from the wizard's session connectorId — those two can differ after a reassignment.
    mockGetAgentlessPolicy.mockResolvedValue({
      item: {
        name: 'existing-agentless-name',
        package: { version: '2.5.0' },
        cloud_connector: { enabled: true, cloud_connector_id: 'fleet-assigned-connector' },
      },
    });
    await cleanupManagedIntegrationsPolicies({
      ...BASE_OPTS,
      // Session still records the original connector — must NOT appear in the PUT body.
      authenticateAndDeployStep: { connectorId: 'original-session-connector' } as never,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    const payload = mockUpdateAgentless.mock.calls[0][1];
    expect(payload.cloud_connector).toEqual({
      enabled: true,
      cloud_connector_id: 'fleet-assigned-connector',
    });
    expect(payload.cloud_connector?.cloud_connector_id).not.toBe('original-session-connector');
  });
});
