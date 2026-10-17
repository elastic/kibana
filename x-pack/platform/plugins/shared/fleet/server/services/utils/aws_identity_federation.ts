/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '../../../common/constants';

import { appContextService } from '..';

/**
 * The LaunchDarkly flag `fleet.awsIdentityFederationEnabled`. Falls back to enabled, as in the
 * browser.
 */
export const isAwsIdentityFederationEnabled = async (): Promise<boolean> => {
  const featureFlags = appContextService.getFeatureFlags();
  if (!featureFlags) {
    return true;
  }

  return await firstValueFrom(
    featureFlags.getBooleanValue$(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true)
  );
};
