/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPackageInfo } from '../../services/epm/packages/get';
import { FleetNotFoundError } from '../../errors';
import { awsOnboardingDiscoveryService } from '../../services/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingDiscoverStepDefinition } from './discover';
import { awsPackageInfoFixture, createStepContext } from './test_helpers';

jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingDiscoveryService: { discover: jest.fn() },
}));
jest.mock('../../services/epm/packages/get', () => ({ getPackageInfo: jest.fn() }));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: {
    getInternalUserSOClient: jest.fn(() => ({})),
  },
}));

const discover = awsOnboardingDiscoveryService.discover as jest.Mock;

const discovery = (overrides: Record<string, unknown>) => ({
  region: 'us-east-1',
  servicesInUse: [],
  cloudtrail: [],
  guarddutyDetectorIds: [],
  errors: [],
  ...overrides,
});

describe('awsOnboardingDiscoverStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (getPackageInfo as jest.Mock).mockResolvedValue(awsPackageInfoFixture);
  });

  const run = () => awsOnboardingDiscoverStepDefinition.handler(createStepContext({}));

  it('maps a billing name to a catalog service and marks it agentless when the policy template allows it', async () => {
    discover.mockResolvedValue(
      discovery({
        accountId: '123456789012',
        servicesInUse: ['Amazon GuardDuty', 'AWS CloudTrail'],
        guarddutyDetectorIds: ['det-1'],
      })
    );

    const result = await run();

    expect(result).toEqual({
      output: {
        account_id: '123456789012',
        region: 'us-east-1',
        services: [
          expect.objectContaining({
            id: 'guardduty',
            billing_name: 'Amazon GuardDuty',
            matched: true,
            agentless: true,
            detector_ids: ['det-1'],
          }),
          expect.objectContaining({
            id: 'aws-cloudtrail',
            billing_name: 'AWS CloudTrail',
            matched: false,
            agentless: false,
          }),
        ],
        errors: [],
      },
    });
  });

  it('lists an unmapped billing name with matched=false and no policy_template', async () => {
    discover.mockResolvedValue(discovery({ servicesInUse: ['Amazon Pinpoint Email'] }));

    const result = await run();

    const [service] = (result as { output: { services: Array<Record<string, unknown>> } }).output
      .services;
    expect(service).toEqual({
      id: 'amazon-pinpoint-email',
      name: 'Amazon Pinpoint Email',
      billing_name: 'Amazon Pinpoint Email',
      matched: false,
      agentless: false,
    });
  });

  it('passes discovery source errors through in errors[]', async () => {
    discover.mockResolvedValue(
      discovery({ errors: [{ source: 'costExplorer', message: 'Cost Explorer not enabled' }] })
    );

    const result = await run();

    expect(result).toEqual({
      output: {
        region: 'us-east-1',
        services: [],
        errors: [{ source: 'costExplorer', message: 'Cost Explorer not enabled' }],
      },
    });
  });

  it('returns a ValidationError when no onboarding credentials are stored', async () => {
    discover.mockRejectedValue(new FleetNotFoundError('not configured'));

    const result = await run();

    expect(result).toEqual({ error: expect.objectContaining({ type: 'ValidationError' }) });
  });

  it('refuses to run while the feature flag is off', async () => {
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(false);

    const result = await run();

    expect(result).toEqual({ error: expect.objectContaining({ type: 'PermissionError' }) });
    expect(discover).not.toHaveBeenCalled();
  });
});
