/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { AGENTIC_AWS_ONBOARDING_FLAG } from '../../../common/constants';

import { appContextService } from '..';

/**
 * Runtime activation of the agent-driven AWS onboarding is the LaunchDarkly flag
 * `fleet.agenticAwsOnboarding` (fallback false); locally it is forced with
 * `feature_flags.overrides` in kibana.dev.yml.
 */
export const isAgenticAwsOnboardingEnabled = async (): Promise<boolean> => {
  const featureFlags = appContextService.getFeatureFlags();
  if (!featureFlags) {
    return false;
  }
  // oxlint-disable-next-line @kbn/eslint/no_feature_flag_snapshot -- called on every request, so each check reads the current flag value
  return await firstValueFrom(featureFlags.getBooleanValue$(AGENTIC_AWS_ONBOARDING_FLAG, false));
};
