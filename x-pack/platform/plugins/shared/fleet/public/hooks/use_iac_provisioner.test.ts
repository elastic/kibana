/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { ENABLE_IAC_PROVISIONER_FLAG } from '../../common/constants';

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
  } as any);
  mockedUseStartServices.mockReturnValue({
    cloud: { isCloudEnabled, isServerlessEnabled },
    featureFlags: { getBooleanValue: jest.fn().mockReturnValue(iacProvisionerEnabled) },
  } as any);
};

describe('useIacProvisioner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'cloud + agentless + flag on',
      {
        isCloudEnabled: true,
        agentlessEnabled: true,
        iacProvisionerEnabled: true,
      },
      true,
    ],
    [
      'serverless + agentless + flag on',
      {
        isServerlessEnabled: true,
        agentlessEnabled: true,
        iacProvisionerEnabled: true,
      },
      true,
    ],
    [
      'flag off',
      {
        isCloudEnabled: true,
        agentlessEnabled: true,
        iacProvisionerEnabled: false,
      },
      false,
    ],
    [
      'agentless off',
      {
        isCloudEnabled: true,
        agentlessEnabled: false,
        iacProvisionerEnabled: true,
      },
      false,
    ],
    ['self-managed', { agentlessEnabled: true, iacProvisionerEnabled: true }, false],
  ])('%s => %s', (_label, environment, expected) => {
    mockEnvironment(environment);

    const { result } = renderHook(() => useIacProvisioner());

    expect(result.current.isIacProvisionerEnabled).toBe(expected);
  });

  it('evaluates fleet.enableIacProvisioner with fallback false', () => {
    const getBooleanValue = jest.fn().mockReturnValue(true);
    mockedUseConfig.mockReturnValue({
      agentless: { enabled: true },
    } as any);
    mockedUseStartServices.mockReturnValue({
      cloud: { isCloudEnabled: true, isServerlessEnabled: false },
      featureFlags: { getBooleanValue },
    } as any);

    renderHook(() => useIacProvisioner());

    expect(getBooleanValue).toHaveBeenCalledWith(ENABLE_IAC_PROVISIONER_FLAG, false);
  });
});
