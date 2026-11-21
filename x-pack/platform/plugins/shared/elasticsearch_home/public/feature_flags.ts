/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/public';
import { INTEGRATED_ONBOARDING_FEATURE_FLAG } from '../common/constants';

/** Emits whether integrated onboarding is enabled, and again whenever the flag changes. */
export const getIntegratedOnboardingEnabled$ = (
  featureFlags: FeatureFlagsStart
): Observable<boolean> => featureFlags.getBooleanValue$(INTEGRATED_ONBOARDING_FEATURE_FLAG, false);

/** React hook returning whether integrated onboarding is enabled. */
export const useIntegratedOnboardingEnabled = (featureFlags: FeatureFlagsStart): boolean =>
  featureFlags.useBooleanValue(INTEGRATED_ONBOARDING_FEATURE_FLAG, false);
