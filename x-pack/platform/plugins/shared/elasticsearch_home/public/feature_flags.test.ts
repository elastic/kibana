/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { renderHook } from '@testing-library/react';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-browser-mocks';
import { INTEGRATED_ONBOARDING_FEATURE_FLAG } from '../common/constants';
import { getIntegratedOnboardingEnabled$, useIntegratedOnboardingEnabled } from './feature_flags';

describe('integrated onboarding feature flag', () => {
  describe('getIntegratedOnboardingEnabled$', () => {
    it('evaluates the flag with a fallback of false', async () => {
      const featureFlags = coreFeatureFlagsMock.createStart();

      await expect(firstValueFrom(getIntegratedOnboardingEnabled$(featureFlags))).resolves.toBe(
        false
      );
      expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(
        INTEGRATED_ONBOARDING_FEATURE_FLAG,
        false
      );
    });

    it('emits again when the flag changes', () => {
      const featureFlags = coreFeatureFlagsMock.createStart();
      const flag$ = new BehaviorSubject(false);
      featureFlags.getBooleanValue$.mockReturnValue(flag$);
      const values: boolean[] = [];

      const subscription = getIntegratedOnboardingEnabled$(featureFlags).subscribe((value) =>
        values.push(value)
      );
      flag$.next(true);
      subscription.unsubscribe();

      expect(values).toEqual([false, true]);
    });
  });

  describe('useIntegratedOnboardingEnabled', () => {
    it('evaluates the flag with a fallback of false', () => {
      const featureFlags = coreFeatureFlagsMock.createStart();

      const { result } = renderHook(() => useIntegratedOnboardingEnabled(featureFlags));

      expect(result.current).toBe(false);
      expect(featureFlags.useBooleanValue).toHaveBeenCalledWith(
        INTEGRATED_ONBOARDING_FEATURE_FLAG,
        false
      );
    });

    it('returns true when the flag is on', () => {
      const featureFlags = coreFeatureFlagsMock.createStart();
      featureFlags.useBooleanValue.mockReturnValue(true);

      const { result } = renderHook(() => useIntegratedOnboardingEnabled(featureFlags));

      expect(result.current).toBe(true);
    });
  });
});
