/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';
import { iacProvisionerService } from '../iac_provisioner';
import { buildIacProvisionerIntegrations } from '../iac_provisioner_integrations';
import { isIacProvisionerEnabled } from '../utils/iac_provisioner';

import { AwsCloudFormationClient } from './cloudformation_client';
import { awsOnboardingCredentialsService } from './credentials';
import { assumeOnboardingRole } from './sts';
import { AwsOnboardingStackService } from './stacks';

jest.mock('../app_context');
jest.mock('../iac_provisioner', () => ({
  iacProvisionerService: { renderTemplate: jest.fn() },
}));
jest.mock('../iac_provisioner_integrations', () => ({
  buildIacProvisionerIntegrations: jest.fn(),
  isBuildError: jest.fn(),
}));
jest.mock('../utils/iac_provisioner');
jest.mock('./cloudformation_client');
jest.mock('./credentials', () => ({
  awsOnboardingCredentialsService: { getDecrypted: jest.fn() },
}));
jest.mock('./sts');

const describeStack = jest.fn();
const describeStackEvents = jest.fn();
const getDeclaredParameterKeys = jest.fn();
const updateStack = jest.fn();
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

  it('queries the events once for a stack that completed', async () => {
    describeStack.mockResolvedValue({
      StackName: 'elastic-onboarding-x',
      StackStatus: 'CREATE_COMPLETE',
    });

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.status).toBe('complete');
    expect(describeStackEvents).toHaveBeenCalledTimes(1);
  });

  it('reports the newest resource event by timestamp while the stack is in progress', async () => {
    describeStack.mockResolvedValue({
      StackName: 'elastic-onboarding-x',
      StackStatus: 'CREATE_IN_PROGRESS',
    });
    // The newest event sits in the middle, so neither the first nor the last entry is it.
    describeStackEvents.mockResolvedValue([
      {
        LogicalResourceId: 'WiiOidcProviderFunction',
        ResourceStatus: 'CREATE_COMPLETE',
        Timestamp: new Date('2026-11-17T10:00:00.000Z'),
      },
      {
        LogicalResourceId: 'WiiOidcProvider',
        ResourceStatus: 'CREATE_IN_PROGRESS',
        ResourceStatusReason: 'Resource creation Initiated',
        Timestamp: new Date('2026-11-17T10:00:05.000Z'),
      },
      {
        LogicalResourceId: 'WiiOidcProviderFunctionRole',
        ResourceStatus: 'CREATE_COMPLETE',
        Timestamp: new Date('2026-11-17T09:59:50.000Z'),
      },
    ]);

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.latestEvent).toEqual({
      resource: 'WiiOidcProvider',
      status: 'CREATE_IN_PROGRESS',
      timestamp: '2026-11-17T10:00:05.000Z',
    });
  });

  it('carries the reason only on a failed event', async () => {
    describeStack.mockResolvedValue(rolledBack);
    describeStackEvents.mockResolvedValue([
      {
        LogicalResourceId: 'WiiOidcProvider',
        ResourceType: 'Custom::WiiOidcProvider',
        ResourceStatus: 'CREATE_FAILED',
        ResourceStatusReason: 'Could not connect to the issuer',
        Timestamp: new Date('2026-11-17T10:00:05.000Z'),
      },
    ]);

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.latestEvent?.reason).toBe('Could not connect to the issuer');
  });

  it('omits latestEvent when the events lookup fails', async () => {
    describeStack.mockResolvedValue({
      StackName: 'elastic-onboarding-x',
      StackStatus: 'CREATE_IN_PROGRESS',
    });
    describeStackEvents.mockRejectedValue(new Error('AccessDenied'));

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.status).toBe('in_progress');
    expect(result.latestEvent).toBeUndefined();
  });

  it("lists each resource's newest status without the stack's own events", async () => {
    describeStack.mockResolvedValue({
      StackName: 'elastic-onboarding-x',
      StackStatus: 'ROLLBACK_IN_PROGRESS',
    });
    describeStackEvents.mockResolvedValue([
      {
        LogicalResourceId: 'elastic-onboarding-x',
        ResourceType: 'AWS::CloudFormation::Stack',
        ResourceStatus: 'ROLLBACK_IN_PROGRESS',
        Timestamp: new Date('2026-11-17T10:00:20.000Z'),
      },
      {
        LogicalResourceId: 'WiiOidcProvider',
        ResourceType: 'Custom::WiiOidcProvider',
        ResourceStatus: 'CREATE_FAILED',
        ResourceStatusReason: 'Could not connect to the issuer',
        Timestamp: new Date('2026-11-17T10:00:15.000Z'),
      },
      {
        LogicalResourceId: 'WiiOidcProviderFunction',
        ResourceType: 'AWS::Lambda::Function',
        ResourceStatus: 'CREATE_COMPLETE',
        Timestamp: new Date('2026-11-17T10:00:10.000Z'),
      },
      {
        LogicalResourceId: 'WiiOidcProvider',
        ResourceType: 'Custom::WiiOidcProvider',
        ResourceStatus: 'CREATE_IN_PROGRESS',
        ResourceStatusReason: 'Resource creation Initiated',
        Timestamp: new Date('2026-11-17T10:00:12.000Z'),
      },
      {
        LogicalResourceId: 'WiiOidcProviderFunction',
        ResourceType: 'AWS::Lambda::Function',
        ResourceStatus: 'CREATE_IN_PROGRESS',
        Timestamp: new Date('2026-11-17T10:00:05.000Z'),
      },
      {
        LogicalResourceId: 'WiiOidcProviderFunctionRole',
        ResourceType: 'AWS::IAM::Role',
        ResourceStatus: 'CREATE_COMPLETE',
        Timestamp: new Date('2026-11-17T10:00:02.000Z'),
      },
    ]);

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.resources).toEqual([
      {
        logicalId: 'WiiOidcProviderFunctionRole',
        status: 'CREATE_COMPLETE',
        updatedAt: '2026-11-17T10:00:02.000Z',
      },
      {
        logicalId: 'WiiOidcProviderFunction',
        status: 'CREATE_COMPLETE',
        updatedAt: '2026-11-17T10:00:10.000Z',
      },
      {
        logicalId: 'WiiOidcProvider',
        status: 'CREATE_FAILED',
        reason: 'Could not connect to the issuer',
        updatedAt: '2026-11-17T10:00:15.000Z',
      },
    ]);
  });

  it('lists no resources when the events lookup fails', async () => {
    describeStack.mockResolvedValue({
      StackName: 'elastic-onboarding-x',
      StackStatus: 'CREATE_IN_PROGRESS',
    });
    describeStackEvents.mockRejectedValue(new Error('AccessDenied'));

    const result = await new AwsOnboardingStackService().status(stackArn);

    expect(result.resources).toEqual([]);
  });
});

describe('AwsOnboardingStackService.update', () => {
  const integrations = [
    { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
  ];
  const rendered = {
    artifactUrl: 'https://example.com/rendered-template',
    templateSha: 'sha-2',
    render: true,
    blueprint: { id: 'wif', version: '4' },
  };
  const update = (templateSha?: string) =>
    new AwsOnboardingStackService().update({
      soClient: {} as any,
      stackArn,
      integrations,
      ...(templateSha && { templateSha }),
      parameters: { ElasticResourceId: 'project-1' },
    });

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(appContextService.getLogger)
      .mockReturnValue({ get: () => ({ info: jest.fn() }) } as any);
    jest
      .mocked(awsOnboardingCredentialsService.getDecrypted)
      .mockResolvedValue({ stackNamePrefix: 'elastic-onboarding' } as any);
    jest.mocked(assumeOnboardingRole).mockResolvedValue({} as any);
    jest.mocked(isIacProvisionerEnabled).mockResolvedValue(true);
    jest.mocked(buildIacProvisionerIntegrations).mockResolvedValue({ integrations } as any);
    jest.mocked(iacProvisionerService.renderTemplate).mockResolvedValue(rendered);
    jest
      .mocked(AwsCloudFormationClient)
      .mockImplementation(() => ({ describeStack, getDeclaredParameterKeys, updateStack } as any));
    describeStack.mockResolvedValue({ StackName: 'elastic-onboarding-x' });
    getDeclaredParameterKeys.mockResolvedValue(['ElasticResourceId']);
    updateStack.mockResolvedValue(stackArn);
  });

  it("renders with the identity's stored template digest", async () => {
    await update('sha-1');

    expect(iacProvisionerService.renderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ integrations, templateSha: 'sha-1' })
    );
  });

  it('updates the stack and names it from CloudFormation', async () => {
    const result = await update('sha-1');

    expect(updateStack).toHaveBeenCalledWith({
      stackArn,
      templateUrl: rendered.artifactUrl,
      parameters: [{ ParameterKey: 'ElasticResourceId', ParameterValue: 'project-1' }],
    });
    expect(result).toEqual({
      stackId: stackArn,
      stackName: 'elastic-onboarding-x',
      template: { source: 'iacp', templateSha: 'sha-2', blueprint: { id: 'wif', version: '4' } },
      noChanges: false,
    });
  });

  it('reports no changes when CloudFormation has nothing to update', async () => {
    updateStack.mockResolvedValue(undefined);

    const result = await update('sha-1');

    expect(result.noChanges).toBe(true);
  });

  it('reports no changes without updating when the stored template digest still matches', async () => {
    jest.mocked(iacProvisionerService.renderTemplate).mockResolvedValue({
      templateSha: 'sha-1',
      render: false,
      blueprint: { id: 'wif', version: '4' },
    });

    const result = await update('sha-1');

    expect(updateStack).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        noChanges: true,
        template: expect.objectContaining({ templateSha: 'sha-1' }),
      })
    );
  });
});
