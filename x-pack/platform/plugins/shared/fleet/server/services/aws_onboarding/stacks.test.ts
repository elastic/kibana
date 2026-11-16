/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import { AwsCloudFormationClient } from './cloudformation_client';
import { awsOnboardingCredentialsService } from './credentials';
import { assumeOnboardingRole } from './sts';
import { AwsOnboardingStackService } from './stacks';

jest.mock('../app_context');
jest.mock('./cloudformation_client');
jest.mock('./credentials', () => ({
  awsOnboardingCredentialsService: { getDecrypted: jest.fn() },
}));
jest.mock('./sts');

const describeStack = jest.fn();
const describeStackEvents = jest.fn();
const warn = jest.fn();

const stackArn = 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-onboarding-x/id';

describe('AwsOnboardingStackService.status', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(appContextService.getLogger).mockReturnValue({ warn } as any);
    jest
      .mocked(awsOnboardingCredentialsService.getDecrypted)
      .mockResolvedValue({ stackNamePrefix: 'elastic-onboarding' } as any);
    jest.mocked(assumeOnboardingRole).mockResolvedValue({} as any);
    jest
      .mocked(AwsCloudFormationClient)
      .mockImplementation(() => ({ describeStack, describeStackEvents } as any));
  });

  const rolledBack = {
    StackName: 'elastic-onboarding-x',
    StackStatus: 'DELETE_COMPLETE',
    StackStatusReason: undefined,
  };

  it('names the earliest failed resource when the stack rolled back', async () => {
    describeStack.mockResolvedValue(rolledBack);
    // Newest first: the rollback deletion failure, the root cause, then the stack's own event.
    describeStackEvents.mockResolvedValue([
      {
        LogicalResourceId: 'Role',
        ResourceType: 'AWS::IAM::Role',
        ResourceStatus: 'DELETE_FAILED',
        ResourceStatusReason: 'rollback problem',
      },
      {
        LogicalResourceId: 'WiiOidcProvider',
        ResourceType: 'Custom::WiiOidcProvider',
        ResourceStatus: 'CREATE_FAILED',
        ResourceStatusReason: 'Could not connect to the issuer',
      },
      {
        LogicalResourceId: 'elastic-onboarding-x',
        ResourceType: 'AWS::CloudFormation::Stack',
        ResourceStatus: 'CREATE_IN_PROGRESS',
      },
    ]);

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.status).toBe('failed');
    expect(result.reason).toBe('WiiOidcProvider: Could not connect to the issuer');
  });

  it('falls back to the stack reason without throwing when the events lookup fails', async () => {
    describeStack.mockResolvedValue({ ...rolledBack, StackStatusReason: 'Stack failed' });
    describeStackEvents.mockRejectedValue(new Error('AccessDenied'));

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.reason).toBe('Stack failed');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not query the events for a stack that completed', async () => {
    describeStack.mockResolvedValue({
      StackName: 'elastic-onboarding-x',
      StackStatus: 'CREATE_COMPLETE',
    });

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.status).toBe('complete');
    expect(describeStackEvents).not.toHaveBeenCalled();
  });
});
