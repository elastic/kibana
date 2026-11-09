/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import {
  ONBOARDING_APP_ID,
  ONBOARDING_ENABLED_FLAG,
  getOnboardingInstancePath,
} from '../services/aws_onboarding_override';

import { useStartServices } from './use_core';

/**
 * Returns a function that gives the URL opening a cloud onboarding instance in the onboarding
 * flow. It gives `undefined` while the onboarding flow is turned off: its app then redirects
 * instead of opening the instance.
 */
export function useOnboardingInstanceUrl() {
  const { application, featureFlags } = useStartServices();
  const isOnboardingEnabled = featureFlags.useBooleanValue(ONBOARDING_ENABLED_FLAG, false);

  return useCallback(
    (onboardingDeploymentId: string) =>
      isOnboardingEnabled
        ? application.getUrlForApp(ONBOARDING_APP_ID, {
            path: getOnboardingInstancePath(onboardingDeploymentId),
          })
        : undefined,
    [application, isOnboardingEnabled]
  );
}
