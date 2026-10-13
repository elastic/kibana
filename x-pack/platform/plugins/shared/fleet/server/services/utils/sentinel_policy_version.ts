/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { ENABLE_SENTINEL_POLICY_VERSION_FLAG } from '../../../common/constants';
import { appContextService } from '../app_context';

/**
 * When enabled, every agent policy is also deployed as `<policy id>#sentinel` and agents are assigned to
 * it, so version-specific policy code paths are exercised for all policies, not only for those with
 * agent version conditions. The plain `<policy id>` document is still deployed: newly enrolled agents
 * and agents enrolled by an older fleet-server use the plain id until they are reassigned.
 *
 * Requires version specific policies, which own the task that reassigns the agents.
 * Runtime activation is the LaunchDarkly flag `fleet.enableSentinelPolicyVersion` (fallback false).
 */
export const isSentinelPolicyVersionEnabled = async (): Promise<boolean> => {
  if (!appContextService.getExperimentalFeatures().enableVersionSpecificPolicies) {
    return false;
  }

  const featureFlags = appContextService.getFeatureFlags();
  if (!featureFlags) {
    return false;
  }

  return await firstValueFrom(
    featureFlags.getBooleanValue$(ENABLE_SENTINEL_POLICY_VERSION_FLAG, false)
  );
};
