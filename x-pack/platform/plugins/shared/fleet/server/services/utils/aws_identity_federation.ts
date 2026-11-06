/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '../../../common/constants';
import type { FleetRequestHandlerContext } from '../../types';

/**
 * The LaunchDarkly flag `fleet.awsIdentityFederationEnabled`, read for the request so the
 * decision follows the flag. Falls back to enabled, as in the browser.
 */
export const isAwsIdentityFederationEnabled = async (
  context: FleetRequestHandlerContext
): Promise<boolean> => {
  const { featureFlags } = await context.core;
  return featureFlags.getBooleanValue(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true);
};
