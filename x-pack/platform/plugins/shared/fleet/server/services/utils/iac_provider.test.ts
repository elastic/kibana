/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import { isIacProviderEnabled } from './iac_provider';

jest.mock('../app_context');

const mockEnvironment = ({
  isCloudEnabled = false,
  isServerlessEnabled = false,
  agentlessEnabled = false,
  iacProviderEnabled = false,
}) => {
  jest.spyOn(appContextService, 'getConfig').mockReturnValue({
    agentless: { enabled: agentlessEnabled },
    iacProvider: { enabled: iacProviderEnabled },
  } as any);
  jest
    .spyOn(appContextService, 'getCloud')
    .mockReturnValue({ isCloudEnabled, isServerlessEnabled } as any);
};

// Mirrors the client-side gate table in
// public/hooks/use_iac_provider.test.ts — the two must stay in agreement.
describe('isIacProviderEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'cloud + agentless + flag',
      { isCloudEnabled: true, agentlessEnabled: true, iacProviderEnabled: true },
      true,
    ],
    [
      'serverless + agentless + flag',
      { isServerlessEnabled: true, agentlessEnabled: true, iacProviderEnabled: true },
      true,
    ],
    [
      'flag off',
      { isCloudEnabled: true, agentlessEnabled: true, iacProviderEnabled: false },
      false,
    ],
    [
      'agentless off',
      { isCloudEnabled: true, agentlessEnabled: false, iacProviderEnabled: true },
      false,
    ],
    ['self-managed', { agentlessEnabled: true, iacProviderEnabled: true }, false],
  ])('%s => %s', (_label, environment, expected) => {
    mockEnvironment(environment);

    expect(isIacProviderEnabled()).toBe(expected);
  });
});
