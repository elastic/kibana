/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useIsPackagePolicyUpgradable } from './use_is_package_policy_upgradable';
import { useGetPackagesQuery } from './use_request/epm';

jest.mock('./use_request/epm');

const mockedUseGetPackagesQuery = useGetPackagesQuery as jest.MockedFunction<
  typeof useGetPackagesQuery
>;

describe('useIsPackagePolicyUpgradable', () => {
  beforeEach(() => {
    mockedUseGetPackagesQuery.mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            status: 'installed',
            installationInfo: {
              name: 'test',
              version: '1.0.0',
            },
          },
        ],
      },
    } as any);
  });
  it('should return true with an upgradable package policy', () => {
    const { result } = renderHook(() => useIsPackagePolicyUpgradable());
    const isUpgradable = result.current.isPackagePolicyUpgradable({
      package: {
        name: 'test',
        version: '0.9.0',
      },
    } as any);
    expect(isUpgradable).toBeTruthy();
  });

  it('should return false with a non upgradable package policy', () => {
    const { result } = renderHook(() => useIsPackagePolicyUpgradable());
    const isUpgradable = result.current.isPackagePolicyUpgradable({
      package: {
        name: 'test',
        version: '1.0.0',
      },
    } as any);
    expect(isUpgradable).toBeFalsy();
  });

  it('should return false with a non installed package', () => {
    const { result } = renderHook(() => useIsPackagePolicyUpgradable());
    const isUpgradable = result.current.isPackagePolicyUpgradable({
      package: {
        name: 'idonotexists',
        version: '1.0.0',
      },
    } as any);
    expect(isUpgradable).toBeFalsy();
  });

  describe('getKeepPoliciesUpToDate', () => {
    it('should return true when keep_policies_up_to_date is true', () => {
      mockedUseGetPackagesQuery.mockReturnValue({
        isLoading: false,
        data: {
          items: [
            {
              status: 'installed',
              installationInfo: {
                name: 'test',
                version: '1.0.0',
                keep_policies_up_to_date: true,
              },
            },
          ],
        },
      } as any);

      const { result } = renderHook(() => useIsPackagePolicyUpgradable());
      const keepUpToDate = result.current.getKeepPoliciesUpToDate({
        package: { name: 'test', version: '1.0.0' },
      } as any);
      expect(keepUpToDate).toBe(true);
    });

    it('should return false when keep_policies_up_to_date is false', () => {
      mockedUseGetPackagesQuery.mockReturnValue({
        isLoading: false,
        data: {
          items: [
            {
              status: 'installed',
              installationInfo: {
                name: 'test',
                version: '1.0.0',
                keep_policies_up_to_date: false,
              },
            },
          ],
        },
      } as any);

      const { result } = renderHook(() => useIsPackagePolicyUpgradable());
      const keepUpToDate = result.current.getKeepPoliciesUpToDate({
        package: { name: 'test', version: '1.0.0' },
      } as any);
      expect(keepUpToDate).toBe(false);
    });

    it('should return false when keep_policies_up_to_date is undefined', () => {
      const { result } = renderHook(() => useIsPackagePolicyUpgradable());
      const keepUpToDate = result.current.getKeepPoliciesUpToDate({
        package: { name: 'test', version: '1.0.0' },
      } as any);
      expect(keepUpToDate).toBe(false);
    });

    it('should return false for a non-installed package', () => {
      const { result } = renderHook(() => useIsPackagePolicyUpgradable());
      const keepUpToDate = result.current.getKeepPoliciesUpToDate({
        package: { name: 'idonotexists', version: '1.0.0' },
      } as any);
      expect(keepUpToDate).toBe(false);
    });
  });
});
