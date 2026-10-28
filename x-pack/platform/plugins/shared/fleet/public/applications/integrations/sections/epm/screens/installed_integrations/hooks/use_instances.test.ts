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

import { useInstances } from './use_instances';

jest.mock('../../../../../../../hooks', () => ({
  useAuthz: jest.fn(),
  useStartServices: jest.fn(),
  useGetAllCloudOnboardingDeploymentsQuery: jest.fn(),
}));

const mockQuery = useGetAllCloudOnboardingDeploymentsQuery as jest.Mock;

const instance = (id: string, packageNames?: string[]) => ({ id, packageNames });

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
      data: { items: [], total: 0, isTruncated: false },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it('groups the instances under every package they cover', () => {
    mockQuery.mockReturnValue({
      data: {
        items: [instance('a', ['aws']), instance('b', ['aws', 'aws_bedrock']), instance('c')],
        total: 3,
        isTruncated: false,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useInstances());

    expect(result.current.instancesByPackage.get('aws')?.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result.current.instancesByPackage.get('aws_bedrock')?.map((i) => i.id)).toEqual(['b']);
    expect(result.current.instancesByPackage.size).toBe(2);
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'groups an instance of a package named %s without throwing',
    (packageName) => {
      mockQuery.mockReturnValue({
        data: {
          items: [instance('a', [packageName]), instance('b', [packageName, 'aws'])],
          total: 2,
          isTruncated: false,
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useInstances());

      expect(result.current.instancesByPackage.get(packageName)?.map((i) => i.id)).toEqual([
        'a',
        'b',
      ]);
      expect(result.current.instancesByPackage.get('aws')?.map((i) => i.id)).toEqual(['b']);
    }
  );

  it('reports when there were too many instances to load them all', () => {
    mockQuery.mockReturnValue({
      data: { items: [instance('a', ['aws'])], total: 2500, isTruncated: true },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useInstances());

    expect(result.current.isTruncated).toBe(true);
  });

  it('reports a failed request and lets the caller retry', () => {
    const refetch = jest.fn();
    mockQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    const { result } = renderHook(() => useInstances());

    expect(result.current.isError).toBe(true);
    expect(result.current.instancesByPackage.size).toBe(0);
    result.current.refetch();
    expect(refetch).toHaveBeenCalled();
  });

  it('does not query without the onboarding flag', () => {
    (useStartServices as jest.Mock).mockReturnValue({
      featureFlags: { useBooleanValue: () => false },
    });

    renderHook(() => useInstances());

    expect(mockQuery).toHaveBeenCalledWith({ provider: 'aws' }, { enabled: false });
  });
});
