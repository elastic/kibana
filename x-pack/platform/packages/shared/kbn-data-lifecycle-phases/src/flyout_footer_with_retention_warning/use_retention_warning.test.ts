/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';

import type { IlmPolicyForFlyout } from '../edit_data_lifecycle_flyout/types';
import { getIlmPolicySummaryStats } from '../edit_data_lifecycle_flyout/ilm_policy_summary_stats';
import { useRetentionWarning } from './flyout_footer_with_retention_warning';

jest.mock('../edit_data_lifecycle_flyout/ilm_policy_summary_stats', () => ({
  getIlmPolicySummaryStats: jest.fn(),
}));

const mockGetIlmPolicySummaryStats = getIlmPolicySummaryStats as jest.MockedFunction<
  typeof getIlmPolicySummaryStats
>;

const POLICY: SerializedPolicy = {
  name: 'my-ilm-policy',
  phases: {
    hot: { min_age: '0ms', actions: {} },
    delete: { min_age: '60d', actions: { delete: {} } },
  },
};

const ilmPolicies: IlmPolicyForFlyout[] = [{ name: POLICY.name, phases: POLICY.phases }];

describe('useRetentionWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when inheriting lifecycle', () => {
    mockGetIlmPolicySummaryStats.mockReturnValue({
      deleteAfter: null,
      phaseCount: 1,
      downsampleStepCount: 1,
    });

    const { result } = renderHook(() =>
      useRetentionWarning({
        ilmPolicies,
        selectedIlmPolicyName: POLICY.name,
        canUseDownsampling: false,
        inheritLifecycle: true,
      })
    );

    expect(result.current).toBe(false);
    expect(mockGetIlmPolicySummaryStats).not.toHaveBeenCalled();
  });

  it('returns false when no policy is selected', () => {
    const { result } = renderHook(() =>
      useRetentionWarning({
        ilmPolicies,
        selectedIlmPolicyName: undefined,
        canUseDownsampling: false,
        inheritLifecycle: false,
      })
    );

    expect(result.current).toBe(false);
    expect(mockGetIlmPolicySummaryStats).not.toHaveBeenCalled();
  });

  it('returns false when selected policy does not exist', () => {
    const { result } = renderHook(() =>
      useRetentionWarning({
        ilmPolicies,
        selectedIlmPolicyName: 'does-not-exist',
        canUseDownsampling: false,
        inheritLifecycle: false,
      })
    );

    expect(result.current).toBe(false);
    expect(mockGetIlmPolicySummaryStats).not.toHaveBeenCalled();
  });

  it('returns false when downsampling is allowed even if policy has downsampling', () => {
    mockGetIlmPolicySummaryStats.mockReturnValue({
      deleteAfter: null,
      phaseCount: 1,
      downsampleStepCount: 2,
    });

    const { result } = renderHook(() =>
      useRetentionWarning({
        ilmPolicies,
        selectedIlmPolicyName: POLICY.name,
        canUseDownsampling: true,
        inheritLifecycle: false,
      })
    );

    expect(result.current).toBe(false);
    expect(mockGetIlmPolicySummaryStats).toHaveBeenCalledWith(POLICY.phases);
  });

  it('returns false by default when canUseDownsampling is not provided', () => {
    mockGetIlmPolicySummaryStats.mockReturnValue({
      deleteAfter: null,
      phaseCount: 1,
      downsampleStepCount: 2,
    });

    const { result } = renderHook(() =>
      useRetentionWarning({
        ilmPolicies,
        selectedIlmPolicyName: POLICY.name,
        inheritLifecycle: false,
      })
    );

    expect(result.current).toBe(false);
  });

  it('returns true when downsampling is not allowed and policy contains downsampling', () => {
    mockGetIlmPolicySummaryStats.mockReturnValue({
      deleteAfter: null,
      phaseCount: 1,
      downsampleStepCount: 1,
    });

    const { result } = renderHook(() =>
      useRetentionWarning({
        ilmPolicies,
        selectedIlmPolicyName: POLICY.name,
        canUseDownsampling: false,
        inheritLifecycle: false,
      })
    );

    expect(result.current).toBe(true);
    expect(mockGetIlmPolicySummaryStats).toHaveBeenCalledWith(POLICY.phases);
  });

  it('returns false when downsampling is not allowed but policy contains no downsampling', () => {
    mockGetIlmPolicySummaryStats.mockReturnValue({
      deleteAfter: null,
      phaseCount: 1,
      downsampleStepCount: 0,
    });

    const { result } = renderHook(() =>
      useRetentionWarning({
        ilmPolicies,
        selectedIlmPolicyName: POLICY.name,
        canUseDownsampling: false,
        inheritLifecycle: false,
      })
    );

    expect(result.current).toBe(false);
    expect(mockGetIlmPolicySummaryStats).toHaveBeenCalledWith(POLICY.phases);
  });
});
