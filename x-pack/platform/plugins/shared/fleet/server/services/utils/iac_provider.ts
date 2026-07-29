/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '..';

import { isAgentlessEnabled } from './agentless';

export interface IacProviderConfig {
  enabled?: boolean;
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
 * The IaC Provider is only reachable from agentless-capable environments for
 * the MVP; on-prem support is pending the auth decision in
 * https://github.com/elastic/security-team/issues/18240.
 */
export const isIacProviderEnabled = (): boolean => {
  return isAgentlessEnabled() && Boolean(appContextService.getConfig()?.iacProvider?.enabled);
};
