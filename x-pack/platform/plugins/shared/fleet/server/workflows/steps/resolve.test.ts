/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPackageInfo } from '../../services/epm/packages/get';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingResolveStepDefinition } from './resolve';
import { awsPackageInfoFixture, createStepContext } from './test_helpers';

jest.mock('../../services/epm/packages/get', () => ({ getPackageInfo: jest.fn() }));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: {
    getInternalUserSOClient: jest.fn(() => ({})),
  },
}));

describe('awsOnboardingResolveStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (getPackageInfo as jest.Mock).mockResolvedValue(awsPackageInfoFixture);
  });

  it('throws a ValidationError naming a service that is not agentless-capable', async () => {
    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({ services: ['guardduty', 'cloudtrail'], region: 'us-east-1' })
    );

    expect(result).toEqual({
      error: expect.objectContaining({
        type: 'ValidationError',
        message: expect.stringContaining('cloudtrail'),
      }),
    });
  });

  it('builds integrations, policy bodies and index patterns for guardduty and ec2 from package metadata', async () => {
    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty', 'ec2'],
        region: 'us-west-2',
        namespace: 'prod',
        account_id: '123456789012',
      })
    );

    const { output } = result as { output: Record<string, any> };
    expect(output.package_name).toBe('aws');
    expect(output.package_version).toBe('8.1.2');
    expect(output.suggested_identity_name).toBe('aws-123456789012-federated-identity');
    expect(output.integrations).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'ec2', enabledInputs: ['aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-s3'] },
        ],
      },
    ]);
    expect(output.policies.map((p: any) => [p.service, p.name])).toEqual([
      ['guardduty', 'aws-guardduty-agentless'],
      ['ec2', 'aws-ec2-agentless'],
    ]);
    const [guardduty] = output.policies;
    expect(guardduty.body).toEqual(
      expect.objectContaining({
        name: 'aws-guardduty-agentless',
        namespace: 'prod',
        package: { name: 'aws', version: '8.1.2' },
      })
    );
    expect(guardduty.body.cloud_connector).toBeUndefined();
    expect(Object.keys(guardduty.body.inputs)).toEqual(['guardduty-aws-s3']);
    expect(output.index_patterns).toEqual(
      expect.arrayContaining(['logs-aws.guardduty-prod', 'logs-aws.ec2_logs-prod'])
    );
  });

  it('refuses to run while the feature flag is off', async () => {
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(false);

    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({ services: ['guardduty'], region: 'us-east-1' })
    );

    expect(result).toEqual({ error: expect.objectContaining({ type: 'PermissionError' }) });
    expect(getPackageInfo).not.toHaveBeenCalled();
  });
});
