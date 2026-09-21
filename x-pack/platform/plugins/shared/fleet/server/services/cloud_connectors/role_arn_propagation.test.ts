/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { CloudConnectorRoleArnPropagationError } from '../../errors';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { packagePolicyService } from '../package_policy';

import { propagateRoleArnToPackagePolicies } from './role_arn_propagation';

jest.mock('../package_policy', () => ({
  packagePolicyService: {
    list: jest.fn(),
    update: jest.fn(),
  },
  toPackagePolicyUpdate: (policy: {
    name: string;
    enabled: boolean;
    policy_ids: string[];
    inputs: unknown;
    vars?: unknown;
    package?: unknown;
  }) => ({
    name: policy.name,
    enabled: policy.enabled,
    policy_ids: policy.policy_ids,
    inputs: policy.inputs,
    vars: policy.vars,
    ...(policy.package ? { package: policy.package } : {}),
  }),
}));
jest.mock('../agent_policy', () => ({
  agentPolicyService: {
    bumpAgentPoliciesByIds: jest.fn(),
  },
}));
jest.mock('../app_context', () => ({
  appContextService: {
    getLogger: () => loggerMock.create(),
    getInternalUserSOClientForSpaceId: jest.fn(),
    getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
  },
}));
jest.mock('../spaces/helpers', () => ({
  getSpaceForPackagePolicy: (policy: { spaceIds?: string[] }) => policy.spaceIds?.[0] ?? 'default',
}));

const OLD_ARN = 'arn:aws:iam::123456789012:role/Old';
const NEW_ARN = 'arn:aws:iam::123456789012:role/New';
const CONNECTOR_ID = 'connector-1';
const PACKAGE = {
  name: 'cloud_security_posture',
  title: 'Security Posture Management',
  version: '1.9.0',
};

const makePolicy = (id: string, roleArn = OLD_ARN, spaceIds = ['default']) => ({
  id,
  name: `policy-${id}`,
  policy_ids: [`agent-${id}`],
  namespace: 'default',
  spaceIds,
  enabled: true,
  package: PACKAGE,
  vars: { account_type: { type: 'text', value: 'single-account' } },
  cloud_connector_id: CONNECTOR_ID,
  inputs: [
    {
      type: 'cloudbeat/cis_aws',
      enabled: true,
      vars: { role_arn: { type: 'text', value: roleArn } },
      streams: [],
    },
  ],
});

describe('propagateRoleArnToPackagePolicies', () => {
  const soClient = savedObjectsClientMock.create();
  const spacelessSoClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createInternalClient();

  beforeEach(() => {
    jest.clearAllMocks();
    (appContextService.getInternalUserSOClientForSpaceId as jest.Mock).mockReturnValue(soClient);
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue(
      spacelessSoClient
    );
  });

  it('updates every referencing package policy with the new ARN', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), makePolicy('b')],
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockResolvedValue({});

    await propagateRoleArnToPackagePolicies({
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(packagePolicyService.update).toHaveBeenCalledTimes(2);
    for (const call of (packagePolicyService.update as jest.Mock).mock.calls) {
      const [, , , update] = call;
      expect(update.inputs[0].vars.role_arn.value).toBe(NEW_ARN);
      // `packagePolicyService.update` rejects payloads without a package.
      expect(update.package).toEqual(PACKAGE);
      // The update is a replace: the policy's own vars have to be carried over.
      expect(update.vars).toEqual({ account_type: { type: 'text', value: 'single-account' } });
    }
  });

  it('reads package policies from every space', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 10000,
    });

    await propagateRoleArnToPackagePolicies({
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    const [listSoClient, listOptions] = (packagePolicyService.list as jest.Mock).mock.calls[0];
    // The route's client is scoped to the caller's space; a connector is shared across spaces.
    expect(listSoClient).toBe(spacelessSoClient);
    expect(listOptions).toEqual(
      expect.objectContaining({
        spaceId: '*',
        kuery: `fleet-package-policies.attributes.cloud_connector_id:"${CONNECTOR_ID}"`,
      })
    );
  });

  it('updates policies in other spaces through their own space client', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a', OLD_ARN, ['default']), makePolicy('b', OLD_ARN, ['marketing'])],
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockResolvedValue({});

    await propagateRoleArnToPackagePolicies({
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(packagePolicyService.update).toHaveBeenCalledTimes(2);
    expect(appContextService.getInternalUserSOClientForSpaceId).toHaveBeenCalledWith('default');
    expect(appContextService.getInternalUserSOClientForSpaceId).toHaveBeenCalledWith('marketing');
    // Each space's agent policies are bumped with a client scoped to that space.
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-a'],
      {},
      'default'
    );
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-b'],
      {},
      'marketing'
    );
  });

  it('defers the agent policy revision bump to a single call per space', async () => {
    // Every policy on a shared agent policy would otherwise race the same `revision` field.
    const shared = [makePolicy('a'), makePolicy('b')].map((policy) => ({
      ...policy,
      policy_ids: ['agent-shared'],
    }));
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: shared,
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockResolvedValue({});

    await propagateRoleArnToPackagePolicies({
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    for (const call of (packagePolicyService.update as jest.Mock).mock.calls) {
      expect(call[4]).toEqual(expect.objectContaining({ bumpRevision: false }));
    }
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledTimes(1);
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-shared'],
      {},
      'default'
    );
  });

  it('bumps the reverted agent policies after a failed fan-out', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), makePolicy('b')],
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('boom');
      return {};
    });

    await expect(
      propagateRoleArnToPackagePolicies({
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);

    // Only `a` was updated and then reverted, so only its agent policy needs the bump.
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledTimes(1);
    expect(agentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      ['agent-a'],
      {},
      'default'
    );
  });

  it('does not bump anything when there is nothing to fan out', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 10000,
    });

    await propagateRoleArnToPackagePolicies({
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(agentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
  });

  it('omits package from the update payload when the policy has none', async () => {
    const { package: _package, ...policyWithoutPackage } = makePolicy('a');
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [policyWithoutPackage],
      total: 1,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockResolvedValue({});

    await propagateRoleArnToPackagePolicies({
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });

    expect(packagePolicyService.update).toHaveBeenCalledTimes(1);
    const updatePayload = (packagePolicyService.update as jest.Mock).mock.calls[0][3];
    expect(Object.hasOwn(updatePayload, 'package')).toBe(false);
    expect(updatePayload.inputs[0].vars.role_arn.value).toBe(NEW_ARN);
  });

  it('is a no-op when no policies reference the connector', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 10000,
    });
    await propagateRoleArnToPackagePolicies({
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('skips policies whose inputs contain no role_arn key', async () => {
    const policyWithoutRoleArn = {
      ...makePolicy('a'),
      inputs: [{ type: 'x', enabled: true, vars: { other: { value: 'v' } }, streams: [] }],
    };
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [policyWithoutRoleArn],
      total: 1,
      page: 1,
      perPage: 10000,
    });
    await propagateRoleArnToPackagePolicies({
      esClient,
      connectorId: CONNECTOR_ID,
      newRoleArn: NEW_ARN,
    });
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('reverts successful policies and throws when one fan-out entry fails', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), makePolicy('b'), makePolicy('c')],
      total: 3,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockImplementation(async (_so, _es, id: string) => {
      if (id === 'b') throw new Error('boom');
      return {};
    });

    await expect(
      propagateRoleArnToPackagePolicies({
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);

    // Two initial updates (a, c) plus two reverts (a, c). b was never asked to revert.
    const calls = (packagePolicyService.update as jest.Mock).mock.calls;
    const revertCalls = calls.filter(
      ([, , , update]) => update.inputs[0].vars.role_arn.value === OLD_ARN
    );
    expect(revertCalls.map(([, , id]) => id).sort()).toEqual(['a', 'c']);
  });

  it('includes both updateFailed and revertFailed in the thrown detail', async () => {
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), makePolicy('b')],
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockImplementation(
      async (
        _so,
        _es,
        id: string,
        update: { inputs: Array<{ vars: { role_arn: { value: string } } }> }
      ) => {
        const to = update.inputs[0].vars.role_arn.value;
        if (id === 'b' && to === NEW_ARN) throw new Error('boom');
        if (id === 'a' && to === OLD_ARN) throw new Error('revert-boom');
        return {};
      }
    );

    let caught: CloudConnectorRoleArnPropagationError | undefined;
    try {
      await propagateRoleArnToPackagePolicies({
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      });
    } catch (err) {
      caught = err as CloudConnectorRoleArnPropagationError;
    }
    expect(caught).toBeInstanceOf(CloudConnectorRoleArnPropagationError);
    expect(caught?.detail.updateFailed).toEqual(['b']);
    expect(caught?.detail.revertFailed).toEqual(['a']);
  });

  it('captures the per-policy pre-update value for revert (not the connector old value)', async () => {
    const drifted = makePolicy('drifted', 'arn:aws:iam::123456789012:role/Drifted');
    (packagePolicyService.list as jest.Mock).mockResolvedValue({
      items: [makePolicy('a'), drifted],
      total: 2,
      page: 1,
      perPage: 10000,
    });
    (packagePolicyService.update as jest.Mock).mockImplementation(
      async (
        _so,
        _es,
        id: string,
        update: { inputs: Array<{ vars: { role_arn: { value: string } } }> }
      ) => {
        if (id === 'a' && update.inputs[0].vars.role_arn.value === NEW_ARN) {
          throw new Error('boom');
        }
        return {};
      }
    );
    await expect(
      propagateRoleArnToPackagePolicies({
        esClient,
        connectorId: CONNECTOR_ID,
        newRoleArn: NEW_ARN,
      })
    ).rejects.toBeInstanceOf(CloudConnectorRoleArnPropagationError);
    const revertCall = (packagePolicyService.update as jest.Mock).mock.calls.find(
      ([, , id, update]) => id === 'drifted' && update.inputs[0].vars.role_arn.value !== NEW_ARN
    );
    // The drifted policy was successfully moved to NEW_ARN, then reverted to its own prior value.
    expect(revertCall?.[3].inputs[0].vars.role_arn.value).toBe(
      'arn:aws:iam::123456789012:role/Drifted'
    );
    expect(revertCall?.[3].package).toEqual(PACKAGE);
  });
});
