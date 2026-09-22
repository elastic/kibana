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
  sendDeletePackagePolicy: jest.fn(),
  sendUpdatePackagePolicy: jest.fn(),
}));

import {
  sendDeleteAgentlessPolicy,
  sendUpdateAgentlessPolicy,
  sendGetPackageInfoByKey,
  sendDeletePackagePolicy,
  sendUpdatePackagePolicy,
} from '@kbn/fleet-plugin/public';

import {
  computePolicyCleanupOps,
  cleanupAgentlessPolicies,
  cleanupPackagePolicies,
} from './policy_cleanup';

import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const mockDeleteAgentless = sendDeleteAgentlessPolicy as jest.Mock;
const mockUpdateAgentless = sendUpdateAgentlessPolicy as jest.Mock;
const mockGetPackageInfo = sendGetPackageInfoByKey as jest.Mock;
const mockDeletePackagePolicy = sendDeletePackagePolicy as jest.Mock;
const mockUpdatePackagePolicy = sendUpdatePackagePolicy as jest.Mock;

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
  mockDeleteAgentless.mockResolvedValue({});
  mockUpdateAgentless.mockResolvedValue({});
  mockDeletePackagePolicy.mockResolvedValue({});
  mockUpdatePackagePolicy.mockResolvedValue({});
});

// ── computePolicyCleanupOps ───────────────────────────────────────────────────

describe('computePolicyCleanupOps', () => {
  it('returns empty ops when pendingCleanupPolicyIds is empty', () => {
    expect(computePolicyCleanupOps({}, { 'inst-a': 'policy-1' })).toEqual({
      toDelete: [],
      toUpdate: [],
    });
  });

  it('puts a policy in toDelete when all its instances were removed', () => {
    const ops = computePolicyCleanupOps({ 'inst-a': 'policy-1' }, {});
    expect(ops.toDelete).toEqual(['policy-1']);
    expect(ops.toUpdate).toEqual([]);
  });

  it('puts a policy in toUpdate with correct survivingInstanceIds when some instances survive', () => {
    const ops = computePolicyCleanupOps(
      { 'inst-a': 'policy-1' }, // inst-a removed
      { 'inst-b': 'policy-1' } // inst-b still deployed
    );
    expect(ops.toDelete).toEqual([]);
    expect(ops.toUpdate).toEqual([{ policyId: 'policy-1', survivingInstanceIds: ['inst-b'] }]);
  });

  it('correctly classifies multiple policies — one fully removed, one partially', () => {
    const ops = computePolicyCleanupOps(
      { 'inst-a': 'policy-delete', 'inst-c': 'policy-update' },
      { 'inst-d': 'policy-update' }
    );
    expect(ops.toDelete).toContain('policy-delete');
    expect(ops.toDelete).not.toContain('policy-update');
    expect(ops.toUpdate).toEqual([{ policyId: 'policy-update', survivingInstanceIds: ['inst-d'] }]);
  });

  it('de-dups: same policyId across multiple removed instances → one entry in toDelete', () => {
    const ops = computePolicyCleanupOps({ 'inst-a': 'policy-1', 'inst-b': 'policy-1' }, {});
    expect(ops.toDelete).toHaveLength(1);
    expect(ops.toDelete).toEqual(['policy-1']);
  });

  it('de-dups: same policyId across multiple removed instances → one entry in toUpdate', () => {
    const ops = computePolicyCleanupOps(
      { 'inst-a': 'policy-1', 'inst-b': 'policy-1' },
      { 'inst-c': 'policy-1' }
    );
    expect(ops.toUpdate).toHaveLength(1);
    expect(ops.toUpdate[0].policyId).toBe('policy-1');
    expect(ops.toUpdate[0].survivingInstanceIds).toEqual(['inst-c']);
  });

  it('ignores surviving instances whose policy is not in pending', () => {
    // inst-b maps to policy-2 which has no removed instances → not in policyMap
    const ops = computePolicyCleanupOps({ 'inst-a': 'policy-1' }, { 'inst-b': 'policy-2' });
    expect(ops.toDelete).toEqual(['policy-1']);
    expect(ops.toUpdate).toEqual([]);
  });
});

// ── cleanupAgentlessPolicies ──────────────────────────────────────────────────

describe('cleanupAgentlessPolicies', () => {
  it('makes no Fleet calls and returns empty ops when pending is empty', async () => {
    const ops = await cleanupAgentlessPolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: {},
      currentPolicyIdsByInstance: {},
    });
    expect(mockDeleteAgentless).not.toHaveBeenCalled();
    expect(mockUpdateAgentless).not.toHaveBeenCalled();
    expect(ops).toEqual({ toDelete: [], toUpdate: [] });
  });

  it('calls sendDeleteAgentlessPolicy for each policy in toDelete', async () => {
    const ops = await cleanupAgentlessPolicies({
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
    const ops = await cleanupAgentlessPolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: {},
    });
    expect(ops).toHaveProperty('toDelete');
    expect(ops).toHaveProperty('toUpdate');
  });

  it('swallows individual delete failures — does not reject the whole call', async () => {
    mockDeleteAgentless.mockRejectedValue(new Error('Fleet 500'));
    await expect(
      cleanupAgentlessPolicies({
        ...BASE_OPTS,
        pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
        currentPolicyIdsByInstance: {},
      })
    ).resolves.toBeDefined();
  });

  it('calls sendGetPackageInfoByKey when toUpdate has entries and surviving members resolve', async () => {
    // inst-b survives policy-1; it must be present in `instances` for resolveSurvivingMembers to find it
    const instance = makeInstance('inst-b', 'vpcflow');
    const service = makeService('vpcflow');
    await cleanupAgentlessPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', service]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    expect(mockGetPackageInfo).toHaveBeenCalledWith('aws');
  });

  it('swallows individual update failures — does not reject the whole call', async () => {
    const instance = makeInstance('inst-b', 'vpcflow');
    const service = makeService('vpcflow');
    mockGetPackageInfo.mockRejectedValue(new Error('pkg fetch failed'));
    await expect(
      cleanupAgentlessPolicies({
        ...BASE_OPTS,
        instances: [instance],
        servicesMap: new Map([['vpcflow', service]]),
        pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
        currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
      })
    ).resolves.toBeDefined();
  });
});

// ── cleanupPackagePolicies ────────────────────────────────────────────────────

describe('cleanupPackagePolicies', () => {
  it('makes no Fleet calls when pending is empty', async () => {
    await cleanupPackagePolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: {},
      currentPolicyIdsByInstance: {},
      selectedAgentPolicyIds: [],
    });
    expect(mockDeletePackagePolicy).not.toHaveBeenCalled();
    expect(mockUpdatePackagePolicy).not.toHaveBeenCalled();
  });

  it('calls sendDeletePackagePolicy for each policy in toDelete', async () => {
    await cleanupPackagePolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1', 'inst-b': 'policy-2' },
      currentPolicyIdsByInstance: {},
      selectedAgentPolicyIds: [],
    });
    expect(mockDeletePackagePolicy).toHaveBeenCalledWith({ packagePolicyIds: ['policy-1'] });
    expect(mockDeletePackagePolicy).toHaveBeenCalledWith({ packagePolicyIds: ['policy-2'] });
  });

  it('swallows individual delete failures — does not reject the whole call', async () => {
    mockDeletePackagePolicy.mockRejectedValue(new Error('Fleet 500'));
    await expect(
      cleanupPackagePolicies({
        ...BASE_OPTS,
        pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
        currentPolicyIdsByInstance: {},
        selectedAgentPolicyIds: [],
      })
    ).resolves.toBeUndefined();
  });

  it('calls sendGetPackageInfoByKey when toUpdate has entries and surviving members resolve', async () => {
    const instance = makeInstance('inst-b', 'vpcflow');
    const service = makeService('vpcflow');
    await cleanupPackagePolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', service]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
      selectedAgentPolicyIds: ['agent-policy-1'],
    });
    expect(mockGetPackageInfo).toHaveBeenCalledWith('aws');
  });

  it('swallows individual update failures — does not reject the whole call', async () => {
    const instance = makeInstance('inst-b', 'vpcflow');
    const service = makeService('vpcflow');
    mockGetPackageInfo.mockRejectedValue(new Error('pkg fetch failed'));
    await expect(
      cleanupPackagePolicies({
        ...BASE_OPTS,
        instances: [instance],
        servicesMap: new Map([['vpcflow', service]]),
        pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
        currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
        selectedAgentPolicyIds: ['agent-policy-1'],
      })
    ).resolves.toBeUndefined();
  });
});

// ── update payload correctness ────────────────────────────────────────────────

describe('updateAgentlessPolicy — payload shape', () => {
  const vpcflow = makeService('vpcflow');
  const instance = makeInstance('inst-b', 'vpcflow');

  it('sends correct package name and version', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupAgentlessPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    const payload = mockUpdateAgentless.mock.calls[0][1];
    expect(payload.package).toEqual({ name: 'aws', version: '2.5.0' });
    expect(payload.namespace).toBe('default');
  });

  it('includes enabled input for the surviving service', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupAgentlessPolicies({
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
          policy_templates: [
            { name: 'unrelated_svc', input: 'httpjson' },
          ],
        },
      },
    });
    await cleanupAgentlessPolicies({
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
    await cleanupAgentlessPolicies({
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

  it('includes cloud_connector block when connectorId is set', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupAgentlessPolicies({
      ...BASE_OPTS,
      authenticateAndDeployStep: { connectorId: 'conn-abc' } as never,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
    });
    const payload = mockUpdateAgentless.mock.calls[0][1];
    expect(payload.cloud_connector).toEqual({
      enabled: true,
      cloud_connector_id: 'conn-abc',
      target_csp: 'aws',
    });
  });
});

describe('updatePackagePolicy — payload shape', () => {
  const vpcflow = makeService('vpcflow');
  const instance = makeInstance('inst-b', 'vpcflow');

  it('sends correct package, namespace, enabled flag, and policy_ids', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupPackagePolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
      selectedAgentPolicyIds: ['agent-policy-1', 'agent-policy-2'],
    });
    const payload = mockUpdatePackagePolicy.mock.calls[0][1];
    expect(payload.package).toEqual({ name: 'aws', version: '2.5.0' });
    expect(payload.namespace).toBe('default');
    expect(payload.enabled).toBe(true);
    expect(payload.policy_ids).toEqual(['agent-policy-1', 'agent-policy-2']);
  });

  it('includes enabled input for the surviving service', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupPackagePolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
      selectedAgentPolicyIds: ['agent-policy-1'],
    });
    const payload = mockUpdatePackagePolicy.mock.calls[0][1];
    expect(payload.inputs['vpcflow-aws-s3']).toBeDefined();
    expect(payload.inputs['vpcflow-aws-s3'].enabled).toBe(true);
  });
});
