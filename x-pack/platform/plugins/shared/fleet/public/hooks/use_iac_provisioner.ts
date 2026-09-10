/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_IAC_PROVISIONER_FLAG } from '../../common/constants';

import { useConfig, useStartServices } from '.';

/**
 * Client-side mirror of the server's `isIacProvisionerEnabled()` gate: the IaC
 * Provisioner is only available where agentless is (cloud or serverless with
 * `xpack.fleet.agentless.enabled`) and the `fleet.enableIacProvisioner`
 * LaunchDarkly flag is on (fallback false). On-prem support is pending the
 * auth decision in https://github.com/elastic/security-team/issues/18240.
 */
export const useIacProvisioner = (): { isIacProvisionerEnabled: boolean } => {
  const config = useConfig();
  const { cloud, featureFlags } = useStartServices();
  const isHosted = Boolean(cloud?.isCloudEnabled || cloud?.isServerlessEnabled);

  return {
    isIacProvisionerEnabled:
      isHosted &&
      config.agentless?.enabled === true &&
      featureFlags.getBooleanValue(ENABLE_IAC_PROVISIONER_FLAG, false),
  };
};
