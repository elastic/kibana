/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  awsOnboardingCredentialsService,
  awsOnboardingDiscoveryService,
} from '../../services/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingCredentialsStepDefinition } from './credentials';
import { createStepContext } from './test_helpers';

jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingCredentialsService: { getPublic: jest.fn() },
  awsOnboardingDiscoveryService: { verify: jest.fn() },
}));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));

const getPublic = awsOnboardingCredentialsService.getPublic as jest.Mock;
const verify = awsOnboardingDiscoveryService.verify as jest.Mock;

describe('awsOnboardingCredentialsStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
  });

  const run = () => awsOnboardingCredentialsStepDefinition.handler(createStepContext({}));

  it('reports configured=false without calling verify when no credentials are stored', async () => {
    getPublic.mockResolvedValue({ configured: false });

    const result = await run();

    expect(result).toEqual({ output: { configured: false } });
    expect(verify).not.toHaveBeenCalled();
  });

  it('reports verify results when credentials are stored', async () => {
    getPublic.mockResolvedValue({ configured: true, mode: 'fully-managed' });
    verify.mockResolvedValue({
      accountId: '123456789012',
      mode: 'fully-managed',
      discovery: { ok: true },
      provisioning: { ok: false, error: 'AccessDenied' },
    });

    const result = await run();

    expect(result).toEqual({
      output: {
        configured: true,
        mode: 'fully-managed',
        account_id: '123456789012',
        discovery_ok: true,
        provisioning_ok: false,
        error: 'provisioning: AccessDenied',
      },
    });
  });

  it('reports the region of the stored credentials', async () => {
    getPublic.mockResolvedValue({ configured: true, mode: 'fully-managed', region: 'eu-west-1' });
    verify.mockResolvedValue({ accountId: '123456789012', discovery: { ok: true } });

    const result = await run();

    expect(result).toEqual({ output: expect.objectContaining({ region: 'eu-west-1' }) });
  });

  it('returns error text instead of throwing when verify rejects', async () => {
    getPublic.mockResolvedValue({ configured: true, mode: 'partially-managed' });
    verify.mockRejectedValue(new Error('decrypt failed'));

    const result = await run();

    expect(result).toEqual({
      output: { configured: true, mode: 'partially-managed', error: 'decrypt failed' },
    });
  });

  it('refuses to run while the feature flag is off', async () => {
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(false);

    const result = await run();

    expect(result).toEqual({ error: expect.objectContaining({ type: 'PermissionError' }) });
    expect(getPublic).not.toHaveBeenCalled();
  });
});
