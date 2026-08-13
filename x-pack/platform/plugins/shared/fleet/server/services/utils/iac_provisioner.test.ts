/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import { isIacProvisionerEnabled } from './iac_provisioner';

jest.mock('../app_context');

const mockEnvironment = ({
  isCloudEnabled = false,
  isServerlessEnabled = false,
  agentlessEnabled = false,
  iacProvisionerEnabled = false,
}) => {
  jest.spyOn(appContextService, 'getConfig').mockReturnValue({
    agentless: { enabled: agentlessEnabled },
    iacProvisioner: { enabled: iacProvisionerEnabled },
  } as any);
  jest
    .spyOn(appContextService, 'getCloud')
    .mockReturnValue({ isCloudEnabled, isServerlessEnabled } as any);
};

// Mirrors the client-side gate table in
// public/hooks/use_iac_provisioner.test.ts — the two must stay in agreement.
describe('isIacProvisionerEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'cloud + agentless + flag',
      { isCloudEnabled: true, agentlessEnabled: true, iacProvisionerEnabled: true },
      true,
    ],
    [
      'serverless + agentless + flag',
      { isServerlessEnabled: true, agentlessEnabled: true, iacProvisionerEnabled: true },
      true,
    ],
    [
      'flag off',
      { isCloudEnabled: true, agentlessEnabled: true, iacProvisionerEnabled: false },
      false,
    ],
    [
      'agentless off',
      { isCloudEnabled: true, agentlessEnabled: false, iacProvisionerEnabled: true },
      false,
    ],
    ['self-managed', { agentlessEnabled: true, iacProvisionerEnabled: true }, false],
  ])('%s => %s', (_label, environment, expected) => {
    mockEnvironment(environment);

    expect(isIacProvisionerEnabled()).toBe(expected);
  });
});
