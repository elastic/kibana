/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_IAC_PROVISIONER_FLAG } from '../../../common/constants';
import { appContextService } from '..';

import { isAgentlessEnabled } from './agentless';

export interface IacProvisionerConfig {
  api?: {
    url?: string;
    tls?: {
      certificate?: string;
      key?: string;
      ca?: string;
    };
  };
}

/**
 * The IaC Provisioner is only reachable from agentless-capable environments for
 * the MVP; on-prem support is pending the auth decision in
 * https://github.com/elastic/security-team/issues/18240.
 *
 * Runtime activation is the LaunchDarkly flag `fleet.enableIacProvisioner`
 * (fallback false). URL and TLS stay in kibana.yml; do not read
 * `xpack.fleet.iacProvisioner.enabled`.
 */
export const isIacProvisionerEnabled = async (): Promise<boolean> => {
  if (!isAgentlessEnabled()) {
    return false;
  }

  const featureFlags = appContextService.getFeatureFlags();
  if (!featureFlags) {
    return false;
  }

  return await featureFlags.getBooleanValue(ENABLE_IAC_PROVISIONER_FLAG, false);
};
