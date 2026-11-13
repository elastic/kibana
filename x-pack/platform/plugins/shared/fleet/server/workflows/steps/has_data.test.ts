/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingHasDataStepDefinition } from './has_data';
import { createStepContext } from './test_helpers';

jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));

const input = {
  policy_ids: ['policy-a', 'policy-b'],
  package_name: 'aws',
  package_version: '8.1.2',
};

const contextWithApi = (callKibanaApi: jest.Mock) => {
  const context = createStepContext(input);
  (context.contextManager as any).callKibanaApi = callKibanaApi;
  return context;
};

describe('awsOnboardingHasDataStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
  });

  it('returns has_data=false when no agent is enrolled for the policy ids', async () => {
    const callKibanaApi = jest.fn().mockResolvedValueOnce({ body: { items: [] } });

    const result = await awsOnboardingHasDataStepDefinition.handler(contextWithApi(callKibanaApi));

    // no data lookup at all: an account with pre-existing aws data must not count as success
    expect(callKibanaApi).toHaveBeenCalledTimes(1);
    expect(callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/fleet/agents',
      query: {
        kuery:
          '(fleet-agents.policy_base_id:(policy-a or policy-b) or (fleet-agents.policy_id:(policy-a or policy-b) and not fleet-agents.policy_base_id:*))',
        perPage: 1000,
        showAgentless: true,
      },
    });
    expect(result).toEqual({
      output: {
        has_data: false,
        agents: [
          { policy_id: 'policy-a', data: false },
          { policy_id: 'policy-b', data: false },
        ],
      },
    });
  });

  it('returns has_data=true only when an enrolled agent reports data for the package', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValueOnce({
        body: {
          items: [
            {
              id: 'agent-1',
              policy_id: 'policy-a:2',
              policy_base_id: 'policy-a',
              status: 'online',
            },
            { id: 'agent-2', policy_id: 'policy-b', status: 'enrolling' },
          ],
        },
      })
      .mockResolvedValueOnce({
        body: { items: [{ 'agent-1': { data: true } }, { 'agent-2': { data: false } }] },
      });

    const result = await awsOnboardingHasDataStepDefinition.handler(contextWithApi(callKibanaApi));

    expect(callKibanaApi).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/api/fleet/agent_status/data',
      query: { agentsIds: 'agent-1,agent-2', pkgName: 'aws', pkgVersion: '8.1.2' },
    });
    expect(result).toEqual({
      output: {
        has_data: true,
        agents: [
          {
            policy_id: 'policy-a',
            agent_id: 'agent-1',
            agent_policy_id: 'policy-a:2',
            status: 'online',
            data: true,
          },
          {
            policy_id: 'policy-b',
            agent_id: 'agent-2',
            agent_policy_id: 'policy-b',
            status: 'enrolling',
            data: false,
          },
        ],
      },
    });

    callKibanaApi
      .mockResolvedValueOnce({ body: { items: [{ id: 'agent-1', policy_id: 'policy-a' }] } })
      .mockResolvedValueOnce({ body: { items: [{ 'agent-1': { data: false } }] } });
    const none = await awsOnboardingHasDataStepDefinition.handler(contextWithApi(callKibanaApi));
    expect((none as any).output.has_data).toBe(false);
  });
});
