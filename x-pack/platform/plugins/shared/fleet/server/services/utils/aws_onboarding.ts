/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { AWS_MANAGED_ONBOARDING_FLAG } from '../../../common/constants';

import { appContextService } from '..';

/**
 * Runtime activation of the managed AWS onboarding POC is the LaunchDarkly flag
 * `fleet.awsManagedOnboarding` (fallback false); locally it is forced with
 * `feature_flags.overrides` in kibana.dev.yml.
 */
export const isAwsManagedOnboardingEnabled = async (): Promise<boolean> => {
  const featureFlags = appContextService.getFeatureFlags();
  if (!featureFlags) {
    return false;
  }
  return await firstValueFrom(featureFlags.getBooleanValue$(AWS_MANAGED_ONBOARDING_FLAG, false));
};
