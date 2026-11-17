/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';
import { awsOnboardingCredentialsService } from '../../services/aws_onboarding/credentials';
import { assumeOnboardingRole } from '../../services/aws_onboarding/sts';
import { AwsCloudFormationClient } from '../../services/aws_onboarding/cloudformation_client';

import { awsOnboardingStackStatusStepDefinition } from './stack_status';
import { createStepContext } from './test_helpers';

// The real stack service and its status mapping run; only the AWS boundary is mocked.
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/aws_onboarding/credentials', () => ({
  awsOnboardingCredentialsService: { getDecrypted: jest.fn() },
}));
jest.mock('../../services/aws_onboarding/sts', () => ({ assumeOnboardingRole: jest.fn() }));
jest.mock('../../services/aws_onboarding/cloudformation_client', () => ({
  AwsCloudFormationClient: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({ appContextService: {} }));
jest.mock('../../services/cloud_connector', () => ({ cloudConnectorService: {} }));
jest.mock('../../services/iac_provisioner', () => ({ iacProvisionerService: {} }));
jest.mock('../../services/iac_provisioner_integrations', () => ({}));
jest.mock('../../services/utils/iac_provisioner', () => ({}));

const describeStack = jest.fn();
const describeStackEvents = jest.fn();

describe('awsOnboardingStackStatusStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (awsOnboardingCredentialsService.getDecrypted as jest.Mock).mockResolvedValue({
      stackNamePrefix: 'elastic',
    });
    (assumeOnboardingRole as jest.Mock).mockResolvedValue({});
    (AwsCloudFormationClient as unknown as jest.Mock).mockImplementation(() => ({
      describeStack,
      describeStackEvents,
    }));
    describeStackEvents.mockResolvedValue([]);
  });

  const run = () =>
    awsOnboardingStackStatusStepDefinition.handler(createStepContext({ stack_id: 'stack-arn' }));

  it('maps ROLLBACK_COMPLETE to failed with the reason', async () => {
    describeStack.mockResolvedValue({
      StackStatus: 'ROLLBACK_COMPLETE',
      StackStatusReason: 'The following resource(s) failed to create: [Role]',
    });

    const result = await run();

    expect(result).toEqual({
      output: expect.objectContaining({
        status: 'failed',
        stack_status: 'ROLLBACK_COMPLETE',
        reason: 'The following resource(s) failed to create: [Role]',
      }),
    });
  });

  it('exposes role_arn from outputs when complete', async () => {
    describeStack.mockResolvedValue({
      StackStatus: 'CREATE_COMPLETE',
      Outputs: [
        { OutputKey: 'RoleArn', OutputValue: 'arn:aws:iam::123456789012:role/elastic' },
        { OutputKey: 'OidcProviderArn', OutputValue: 'arn:aws:iam::123456789012:oidc-provider/x' },
      ],
    });

    const result = await run();

    expect(result).toEqual({
      output: expect.objectContaining({
        status: 'complete',
        role_arn: 'arn:aws:iam::123456789012:role/elastic',
        oidc_provider_arn: 'arn:aws:iam::123456789012:oidc-provider/x',
      }),
    });
  });

  it('maps the newest resource event to latest_event', async () => {
    describeStack.mockResolvedValue({ StackStatus: 'CREATE_IN_PROGRESS' });
    describeStackEvents.mockResolvedValue([
      {
        LogicalResourceId: 'Role',
        ResourceStatus: 'CREATE_IN_PROGRESS',
        Timestamp: new Date('2026-11-17T10:00:05.000Z'),
      },
    ]);

    const result = await run();

    expect(result).toEqual({
      output: expect.objectContaining({
        status: 'in_progress',
        latest_event: {
          resource: 'Role',
          status: 'CREATE_IN_PROGRESS',
          timestamp: '2026-11-17T10:00:05.000Z',
        },
      }),
    });
  });
});
