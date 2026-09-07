/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { REGION_PREFERENCES_REDESIGN_FEATURE_FLAG } from '../../common/constants';
import { useKibana } from './use_kibana';
import { useRegionPreferencesRedesignEnabled } from './use_region_preferences_redesign_enabled';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const renderRedesignEnabled = (featureFlagValue: boolean) => {
  const getBooleanValue = jest.fn().mockReturnValue(featureFlagValue);
  mockUseKibana.mockReturnValue({
    services: { featureFlags: { getBooleanValue } },
  });
  return { ...renderHook(() => useRegionPreferencesRedesignEnabled()), getBooleanValue };
};

describe('useRegionPreferencesRedesignEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the feature flag is on', () => {
    const { result, getBooleanValue } = renderRedesignEnabled(true);

    expect(result.current).toBe(true);
    expect(getBooleanValue).toHaveBeenCalledWith(REGION_PREFERENCES_REDESIGN_FEATURE_FLAG, false);
  });

  it('returns false when the feature flag is off', () => {
    const { result, getBooleanValue } = renderRedesignEnabled(false);

    expect(result.current).toBe(false);
    expect(getBooleanValue).toHaveBeenCalledWith(REGION_PREFERENCES_REDESIGN_FEATURE_FLAG, false);
  });
});
