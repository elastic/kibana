/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { CloudOnboardingDeployment } from '../../../common/types/models/cloud_onboarding_deployment';
import { appContextService } from '../../services/app_context';
import { packagePolicyService } from '../../services/package_policy';
import { getAgentCountForAgentPolicies } from '../../services/agent_policies/agent_policy_agent_count';

import { enrichDeployments, getServicesByMethod } from './list_enrichment';

jest.mock('../../services/app_context');
jest.mock('../../services/package_policy');
jest.mock('../../services/agent_policies/agent_policy_agent_count');

const makeDeployment = (
  overrides: Partial<CloudOnboardingDeployment> = {}
): CloudOnboardingDeployment => ({
  id: 'd1',
  provider: 'aws',
  mechanisms: ['managed_integration'],
  services: ['cloudtrail', 'vpcflow'],
  status: 'succeeded',
  attemptCount: 1,
  ...overrides,
});

describe('getServicesByMethod', () => {
  it('puts all services of a managed integration deployment under managed_integration', () => {
    expect(getServicesByMethod(makeDeployment())).toEqual({
      managed_integration: ['cloudtrail', 'vpcflow'],
    });
  });

  it('puts all services of an agent-based deployment under agent_based', () => {
    expect(getServicesByMethod(makeDeployment({ mechanisms: ['agent_based'] }))).toEqual({
      agent_based: ['cloudtrail', 'vpcflow'],
    });
  });

  it('puts all services of an ECF-only deployment under ecf', () => {
    expect(getServicesByMethod(makeDeployment({ mechanisms: ['ecf'] }))).toEqual({
      ecf: ['cloudtrail', 'vpcflow'],
    });
  });

  it('splits a managed integration + ECF deployment by the services of its ECF stacks', () => {
    expect(
      getServicesByMethod(
        makeDeployment({
          mechanisms: ['managed_integration', 'ecf'],
          ecfStacks: [
            {
              family: 'unified',
              stackName: 's',
              templateVersion: '1.0.0',
              serviceIds: ['vpcflow'],
            },
          ],
        })
      )
    ).toEqual({ managed_integration: ['cloudtrail'], ecf: ['vpcflow'] });
  });

  it('keeps services under managed_integration until an ECF stack is launched', () => {
    expect(
      getServicesByMethod(makeDeployment({ mechanisms: ['managed_integration', 'ecf'] }))
    ).toEqual({ managed_integration: ['cloudtrail', 'vpcflow'] });
  });
});

describe('enrichDeployments', () => {
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(appContextService.getInternalUserESClient).mockReturnValue({} as any);
    jest.mocked(packagePolicyService.getByIDs).mockResolvedValue([
      { id: 'pp1', policy_ids: ['ap1'], package: { name: 'aws', title: 'AWS', version: '8.11.0' } },
      {
        id: 'pp2',
        policy_ids: ['ap2'],
        package: { name: 'aws_bedrock', title: 'Amazon Bedrock', version: '1.2.0' },
      },
      { id: 'pp3', policy_ids: ['ap1'], package: { name: 'aws', title: 'AWS', version: '8.11.0' } },
    ] as any);
    jest.mocked(getAgentCountForAgentPolicies).mockResolvedValue({ ap1: 1, ap2: 2 });
  });

  it('adds the deployed package versions once per package and the agents of its policies', async () => {
    const [item] = await enrichDeployments(soClient, [
      makeDeployment({ packagePolicyIds: ['pp1', 'pp2', 'pp3'] }),
    ]);

    expect(item.packages).toEqual([
      { name: 'aws', title: 'AWS', version: '8.11.0' },
      { name: 'aws_bedrock', title: 'Amazon Bedrock', version: '1.2.0' },
    ]);
    expect(item.agentCount).toBe(3);
    expect(item.servicesByMethod).toEqual({ managed_integration: ['cloudtrail', 'vpcflow'] });
  });

  it('counts the agents of the stored agent policies of an agent-based deployment', async () => {
    const [item] = await enrichDeployments(soClient, [
      makeDeployment({ mechanisms: ['agent_based'], agentPolicyIds: ['ap2'] }),
    ]);

    expect(item.packages).toEqual([]);
    expect(item.agentCount).toBe(2);
  });

  it('does not query policies for a deployment without any, like ECF-only', async () => {
    const [item] = await enrichDeployments(soClient, [makeDeployment({ mechanisms: ['ecf'] })]);

    expect(packagePolicyService.getByIDs).not.toHaveBeenCalled();
    expect(getAgentCountForAgentPolicies).not.toHaveBeenCalled();
    expect(item).toEqual(expect.objectContaining({ packages: [], agentCount: 0 }));
  });

  it('skips package policies that no longer exist', async () => {
    const [item] = await enrichDeployments(soClient, [
      makeDeployment({ packagePolicyIds: ['pp1', 'missing'] }),
    ]);

    expect(item.packages).toEqual([{ name: 'aws', title: 'AWS', version: '8.11.0' }]);
  });
});
