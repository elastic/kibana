/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendDeletePackagePolicy: jest.fn(),
  sendUpdatePackagePolicy: jest.fn(),
  sendGetPackageInfoByKey: jest.fn(),
  sendGetOnePackagePolicy: jest.fn(),
}));

import {
  sendDeletePackagePolicy,
  sendUpdatePackagePolicy,
  sendGetPackageInfoByKey,
  sendGetOnePackagePolicy,
} from '@kbn/fleet-plugin/public';

import { cleanupAgentBasedPolicies } from './policy_cleanup_agent_based';
import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const mockDeletePackagePolicy = sendDeletePackagePolicy as jest.Mock;
const mockUpdatePackagePolicy = sendUpdatePackagePolicy as jest.Mock;
const mockGetPackageInfo = sendGetPackageInfoByKey as jest.Mock;
const mockGetOnePackagePolicy = sendGetOnePackagePolicy as jest.Mock;

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
  mockGetOnePackagePolicy.mockResolvedValue({
    data: {
      item: {
        name: 'existing-policy-name',
        namespace: 'existing-ns',
        package: { version: '2.5.0' },
      },
    },
  });
  mockDeletePackagePolicy.mockResolvedValue({});
  mockUpdatePackagePolicy.mockResolvedValue({});
});

// ── cleanupAgentBasedPolicies ─────────────────────────────────────────────────

describe('cleanupAgentBasedPolicies', () => {
  it('makes no Fleet calls when pending is empty', async () => {
    await cleanupAgentBasedPolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: {},
      currentPolicyIdsByInstance: {},
      selectedAgentPolicyIds: [],
    });
    expect(mockDeletePackagePolicy).not.toHaveBeenCalled();
    expect(mockUpdatePackagePolicy).not.toHaveBeenCalled();
  });

  it('calls sendDeletePackagePolicy for each policy in toDelete', async () => {
    await cleanupAgentBasedPolicies({
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
    const ops = await cleanupAgentBasedPolicies({
      ...BASE_OPTS,
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: {},
      selectedAgentPolicyIds: [],
    });
    // Failed op is not in returned succeeded ops.
    expect(ops.toDelete).not.toContain('policy-1');
  });

  it('calls sendGetPackageInfoByKey when toUpdate has entries and surviving members resolve', async () => {
    const instance = makeInstance('inst-b', 'vpcflow');
    const service = makeService('vpcflow');
    await cleanupAgentBasedPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', service]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
      selectedAgentPolicyIds: ['agent-policy-1'],
    });
    expect(mockGetPackageInfo).toHaveBeenCalledWith('aws', '2.5.0');
  });

  it('fires PUT when instances is empty — synthesises base instance from servicesMap', async () => {
    const service = makeService('vpcflow');
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    const ops = await cleanupAgentBasedPolicies({
      ...BASE_OPTS,
      instances: [],
      servicesMap: new Map([['vpcflow', service]]),
      // 'removed-svc' is being cleaned up; 'vpcflow' survives in the same policy.
      pendingCleanupPolicyIds: { 'removed-svc': 'policy-1' },
      currentPolicyIdsByInstance: { vpcflow: 'policy-1' },
      selectedAgentPolicyIds: ['agent-policy-1'],
    });
    expect(mockUpdatePackagePolicy).toHaveBeenCalled();
    expect(ops.toUpdate).toHaveLength(1);
    expect(ops.toUpdate[0].policyId).toBe('policy-1');
  });

  it('swallows individual update failures — does not reject the whole call', async () => {
    const instance = makeInstance('inst-b', 'vpcflow');
    const service = makeService('vpcflow');
    mockGetPackageInfo.mockRejectedValue(new Error('pkg fetch failed'));
    const ops = await cleanupAgentBasedPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', service]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
      selectedAgentPolicyIds: ['agent-policy-1'],
    });
    // Failed update not in returned succeeded ops.
    expect(ops.toUpdate).toHaveLength(0);
  });
});

// ── updateAgentBasedPolicy — payload shape ────────────────────────────────────

describe('updateAgentBasedPolicy — payload shape', () => {
  const vpcflow = makeService('vpcflow');
  const instance = makeInstance('inst-b', 'vpcflow');

  it('sends correct package, existing namespace, and policy_ids', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupAgentBasedPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([['vpcflow', vpcflow]]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
      selectedAgentPolicyIds: ['agent-policy-1', 'agent-policy-2'],
    });
    const payload = mockUpdatePackagePolicy.mock.calls[0][1];
    expect(payload.package).toEqual({ name: 'aws', version: '2.5.0' });
    // Preserves existing policy's namespace (fetched via sendGetOnePackagePolicy).
    expect(payload.namespace).toBe('existing-ns');
    expect(payload.name).toBe('existing-policy-name');
    expect(payload.policy_ids).toEqual(['agent-policy-1', 'agent-policy-2']);
  });

  it('includes enabled input for the surviving service', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '2.5.0', vars: [], policy_templates: [] } },
    });
    await cleanupAgentBasedPolicies({
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

  it('disables removed service input in PUT body when package manifest includes its template', async () => {
    // Package manifest lists both vpcflow (surviving) and removed-svc (removed) templates.
    // The cleanup PUT must set removed-svc's input to enabled:false — not silently omit it —
    // so Fleet does not keep collecting from the removed service.
    const removedSvc = makeService('removed-svc');
    mockGetPackageInfo.mockResolvedValue({
      data: {
        item: {
          version: '2.5.0',
          vars: [],
          policy_templates: [
            { name: 'vpcflow', inputs: [{ type: 'aws-s3' }] },
            { name: 'removed-svc', inputs: [{ type: 'aws-s3' }] },
          ],
        },
      },
    });
    await cleanupAgentBasedPolicies({
      ...BASE_OPTS,
      instances: [instance],
      servicesMap: new Map([
        ['vpcflow', vpcflow],
        ['removed-svc', removedSvc],
      ]),
      pendingCleanupPolicyIds: { 'inst-a': 'policy-1' },
      currentPolicyIdsByInstance: { 'inst-b': 'policy-1' },
      selectedAgentPolicyIds: ['agent-policy-1'],
    });
    const payload = mockUpdatePackagePolicy.mock.calls[0][1];
    expect(payload.inputs['vpcflow-aws-s3'].enabled).toBe(true);
    expect(payload.inputs['removed-svc-aws-s3']).toEqual({ enabled: false, streams: {} });
  });
});
