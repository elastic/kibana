/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConfig, useStartServices } from '.';

/**
 * Client-side mirror of the server's `isIacProviderEnabled()` gate: the IaC
 * Provider is only available where agentless is (cloud or serverless with
 * `xpack.fleet.agentless.enabled`) and the `xpack.fleet.iacProvider.enabled`
 * flag is on. On-prem support is pending the auth decision in
 * https://github.com/elastic/security-team/issues/18240.
 */
export const useIacProvider = (): { isIacProviderEnabled: boolean } => {
  const config = useConfig();
  const { cloud } = useStartServices();
  const isHosted = Boolean(cloud?.isCloudEnabled || cloud?.isServerlessEnabled);

  return {
    isIacProviderEnabled:
      isHosted && config.agentless?.enabled === true && config.iacProvider?.enabled === true,
  };
};
