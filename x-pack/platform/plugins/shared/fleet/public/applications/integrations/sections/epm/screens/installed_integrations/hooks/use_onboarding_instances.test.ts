/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import {
  useAuthz,
  useGetAllCloudOnboardingDeploymentsQuery,
  useStartServices,
} from '../../../../../../../hooks';

import { useOnboardingInstances } from './use_onboarding_instances';

jest.mock('../../../../../../../hooks', () => ({
  useAuthz: jest.fn(),
  useStartServices: jest.fn(),
  useGetAllCloudOnboardingDeploymentsQuery: jest.fn(),
}));

const mockQuery = useGetAllCloudOnboardingDeploymentsQuery as jest.Mock;

const onboardingInstance = (id: string, packageNames?: string[]) => ({ id, packageNames });

describe('useOnboardingInstances', () => {
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
      data: { items: [], total: 0, isTruncated: false },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it('groups the instances under every package they cover', () => {
    mockQuery.mockReturnValue({
      data: {
        items: [
          onboardingInstance('a', ['aws']),
          onboardingInstance('b', ['aws', 'aws_bedrock']),
          onboardingInstance('c'),
        ],
        total: 3,
        isTruncated: false,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingInstances());

    expect(result.current.onboardingInstancesByPackage.get('aws')?.map((i) => i.id)).toEqual([
      'a',
      'b',
    ]);
    expect(
      result.current.onboardingInstancesByPackage.get('aws_bedrock')?.map((i) => i.id)
    ).toEqual(['b']);
    expect(result.current.onboardingInstancesByPackage.size).toBe(2);
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'groups an instance of a package named %s without throwing',
    (packageName) => {
      mockQuery.mockReturnValue({
        data: {
          items: [
            onboardingInstance('a', [packageName]),
            onboardingInstance('b', [packageName, 'aws']),
          ],
          total: 2,
          isTruncated: false,
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useOnboardingInstances());

      expect(
        result.current.onboardingInstancesByPackage.get(packageName)?.map((i) => i.id)
      ).toEqual(['a', 'b']);
      expect(result.current.onboardingInstancesByPackage.get('aws')?.map((i) => i.id)).toEqual([
        'b',
      ]);
    }
  );

  it('reports when there were too many instances to load them all', () => {
    mockQuery.mockReturnValue({
      data: { items: [onboardingInstance('a', ['aws'])], total: 2500, isTruncated: true },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingInstances());

    expect(result.current.isTruncated).toBe(true);
  });

  it('reports a failed request and lets the caller retry', () => {
    const refetch = jest.fn();
    mockQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    const { result } = renderHook(() => useOnboardingInstances());

    expect(result.current.isError).toBe(true);
    expect(result.current.onboardingInstancesByPackage.size).toBe(0);
    result.current.refetch();
    expect(refetch).toHaveBeenCalled();
  });

  it('does not query without the onboarding flag', () => {
    (useStartServices as jest.Mock).mockReturnValue({
      featureFlags: { useBooleanValue: () => false },
    });

    renderHook(() => useOnboardingInstances());

    expect(mockQuery).toHaveBeenCalledWith({ provider: 'aws' }, { enabled: false });
  });
});
