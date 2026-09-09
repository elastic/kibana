/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_IAC_PROVISIONER_FLAG } from '../../../common/constants';
import { appContextService } from '../app_context';

import { isIacProvisionerEnabled } from './iac_provisioner';

jest.mock('../app_context');

const mockEnvironment = ({
  isCloudEnabled = false,
  isServerlessEnabled = false,
  agentlessEnabled = false,
  launchDarklyEnabled,
  iacProvisionerConfigEnabled = false,
}: {
  isCloudEnabled?: boolean;
  isServerlessEnabled?: boolean;
  agentlessEnabled?: boolean;
  launchDarklyEnabled?: boolean;
  iacProvisionerConfigEnabled?: boolean;
}) => {
  jest.spyOn(appContextService, 'getConfig').mockReturnValue({
    agentless: { enabled: agentlessEnabled },
    iacProvisioner: { enabled: iacProvisionerConfigEnabled },
  } as any);
  jest
    .spyOn(appContextService, 'getCloud')
    .mockReturnValue({ isCloudEnabled, isServerlessEnabled } as any);

  if (launchDarklyEnabled === undefined) {
    jest.spyOn(appContextService, 'getFeatureFlags').mockReturnValue(undefined);
  } else {
    jest.spyOn(appContextService, 'getFeatureFlags').mockReturnValue({
      getBooleanValue: jest.fn().mockResolvedValue(launchDarklyEnabled),
    } as any);
  }
};

// Mirrors the client-side gate table in
// public/hooks/use_iac_provisioner.test.ts — the two must stay in agreement.
describe('isIacProvisionerEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'cloud + agentless + LD on',
      { isCloudEnabled: true, agentlessEnabled: true, launchDarklyEnabled: true },
      true,
    ],
    [
      'serverless + agentless + LD on',
      { isServerlessEnabled: true, agentlessEnabled: true, launchDarklyEnabled: true },
      true,
    ],
    ['LD off', { isCloudEnabled: true, agentlessEnabled: true, launchDarklyEnabled: false }, false],
    ['featureFlags service missing', { isCloudEnabled: true, agentlessEnabled: true }, false],
    [
      'agentless off',
      { isCloudEnabled: true, agentlessEnabled: false, launchDarklyEnabled: true },
      false,
    ],
    ['self-managed', { agentlessEnabled: true, launchDarklyEnabled: true }, false],
    [
      'kibana.yml enabled true does not override LD off',
      {
        isCloudEnabled: true,
        agentlessEnabled: true,
        launchDarklyEnabled: false,
        iacProvisionerConfigEnabled: true,
      },
      false,
    ],
  ])('%s => %s', async (_label, environment, expected) => {
    mockEnvironment(environment);

    await expect(isIacProvisionerEnabled()).resolves.toBe(expected);
  });

  it('evaluates fleet.enableIacProvisioner with fallback false', async () => {
    mockEnvironment({
      isCloudEnabled: true,
      agentlessEnabled: true,
      launchDarklyEnabled: true,
    });

    await isIacProvisionerEnabled();

    expect(appContextService.getFeatureFlags()?.getBooleanValue).toHaveBeenCalledWith(
      ENABLE_IAC_PROVISIONER_FLAG,
      false
    );
  });
});
