/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import {
  useAuthz,
  useGetCloudOnboardingDeploymentCountsQuery,
  useStartServices,
} from '../../../../../../../hooks';

import { useInstances } from './use_instances';

jest.mock('../../../../../../../hooks', () => ({
  useAuthz: jest.fn(),
  useStartServices: jest.fn(),
  useGetCloudOnboardingDeploymentCountsQuery: jest.fn(),
}));

const mockQuery = useGetCloudOnboardingDeploymentCountsQuery as jest.Mock;

describe('useInstances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useStartServices as jest.Mock).mockReturnValue({
      featureFlags: { useBooleanValue: () => true },
    });
    (useAuthz as jest.Mock).mockReturnValue({
      fleet: { readAgentPolicies: true },
      integrations: { readPackageInfo: false },
    });
    mockQuery.mockReturnValue({
      data: { counts: {} },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it('returns the instance count of each package', () => {
    mockQuery.mockReturnValue({
      data: { counts: { aws: 3, aws_bedrock: 1 } },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useInstances());

    expect(result.current.instanceCounts.get('aws')).toBe(3);
    expect(result.current.instanceCounts.get('aws_bedrock')).toBe(1);
    expect(result.current.instanceCounts.size).toBe(2);
  });

  it.each(['constructor', '__proto__', 'toString'])(
    'keeps a package named %s apart from object properties',
    (packageName) => {
      mockQuery.mockReturnValue({
        data: { counts: JSON.parse(`{"${packageName}": 2}`) },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useInstances());

      expect(result.current.instanceCounts.get(packageName)).toBe(2);
      expect(result.current.instanceCounts.get('aws')).toBeUndefined();
    }
  );

  it('reports a failed request and lets the caller retry', () => {
    const refetch = jest.fn();
    mockQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    const { result } = renderHook(() => useInstances());

    expect(result.current.isError).toBe(true);
    expect(result.current.instanceCounts.size).toBe(0);
    result.current.refetch();
    expect(refetch).toHaveBeenCalled();
  });

  it('does not query without the onboarding flag', () => {
    (useStartServices as jest.Mock).mockReturnValue({
      featureFlags: { useBooleanValue: () => false },
    });

    const { result } = renderHook(() => useInstances());

    expect(mockQuery).toHaveBeenCalledWith({ provider: 'aws' }, { enabled: false });
    expect(result.current.isEnabled).toBe(false);
  });
});
