/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useConfig, useStartServices } from '.';

import { useIacProvisioner } from './use_iac_provisioner';

jest.mock('./use_config');
jest.mock('./use_core');

const mockedUseConfig = jest.mocked(useConfig);
const mockedUseStartServices = jest.mocked(useStartServices);

const mockEnvironment = ({
  isCloudEnabled = false,
  isServerlessEnabled = false,
  agentlessEnabled = false,
  iacProvisionerEnabled = false,
}) => {
  mockedUseConfig.mockReturnValue({
    agentless: { enabled: agentlessEnabled },
    iacProvisioner: { enabled: iacProvisionerEnabled },
  } as any);
  mockedUseStartServices.mockReturnValue({
    cloud: { isCloudEnabled, isServerlessEnabled },
  } as any);
};

describe('useIacProvisioner', () => {
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

    const { result } = renderHook(() => useIacProvisioner());

    expect(result.current.isIacProvisionerEnabled).toBe(expected);
  });
});
