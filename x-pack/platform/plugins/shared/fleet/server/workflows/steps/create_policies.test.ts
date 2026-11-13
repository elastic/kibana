/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingCreatePoliciesStepDefinition } from './create_policies';
import { createStepContext } from './test_helpers';

jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));

const policy = (service: string) => ({
  service,
  name: `aws-${service}-agentless`,
  body: { name: `aws-${service}-agentless`, namespace: 'default' },
});

const contextWithApi = (callKibanaApi: jest.Mock, input: Record<string, unknown>) => {
  const context = createStepContext(input);
  (context.contextManager as any).callKibanaApi = callKibanaApi;
  return context;
};

describe('awsOnboardingCreatePoliciesStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
  });

  it('posts one managed integration per policy with the connector attached and returns ids in order', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValueOnce({ body: { item: { id: 'policy-guardduty' } } })
      .mockResolvedValueOnce({ body: { item: { id: 'policy-ec2' } } });

    const result = await awsOnboardingCreatePoliciesStepDefinition.handler(
      contextWithApi(callKibanaApi, {
        // the duplicate guardduty entry must be dropped, keeping the first
        policies: [policy('guardduty'), policy('ec2'), policy('guardduty')],
        cloud_connector_id: 'connector-1',
      })
    );

    expect(callKibanaApi).toHaveBeenCalledTimes(2);
    expect(callKibanaApi).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      path: '/api/fleet/managed_integrations',
      body: {
        name: 'aws-guardduty-agentless',
        namespace: 'default',
        cloud_connector: { enabled: true, cloud_connector_id: 'connector-1', target_csp: 'aws' },
      },
    });
    expect(callKibanaApi.mock.calls[1][0].body.name).toBe('aws-ec2-agentless');
    expect(result).toEqual({
      output: {
        policies: [
          { service: 'guardduty', policy_id: 'policy-guardduty' },
          { service: 'ec2', policy_id: 'policy-ec2' },
        ],
        policy_ids: ['policy-guardduty', 'policy-ec2'],
      },
    });
  });

  it('stops and returns an error when a create call fails', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValueOnce({ body: { item: { id: 'policy-guardduty' } } })
      .mockRejectedValueOnce(new Error('HTTP 400: bad inputs'));

    const result = await awsOnboardingCreatePoliciesStepDefinition.handler(
      contextWithApi(callKibanaApi, {
        policies: [policy('guardduty'), policy('ec2'), policy('config')],
        cloud_connector_id: 'connector-1',
      })
    );

    expect(callKibanaApi).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      error: expect.objectContaining({
        type: 'NetworkError',
        message: expect.stringContaining('ec2'),
        details: { service: 'ec2', created: ['policy-guardduty'] },
      }),
    });
    expect((result as any).output).toBeUndefined();
  });
});
