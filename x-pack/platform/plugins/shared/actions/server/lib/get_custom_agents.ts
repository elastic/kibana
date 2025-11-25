/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent as HttpAgent } from 'http';
import type { Agent as HttpsAgent } from 'https';
import type { Logger } from '@kbn/core/server';
import type { SSLSettings } from '@kbn/actions-utils';
import { getCustomAgents as getCustomAgentsHelper } from '@kbn/actions-utils';
import type { ActionsConfigurationUtilities } from '../actions_config';

/**
 * Create http and https proxy agents with custom proxy /hosts/SSL settings from configurationUtilities
 */
interface GetCustomAgentsResponse {
  httpAgent: HttpAgent | undefined;
  httpsAgent: HttpsAgent | undefined;
}

export function getCustomAgents(
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  url: string,
  sslOverrides?: SSLSettings
): GetCustomAgentsResponse {
  const generalSSLSettings = configurationUtilities.getSSLSettings();
  const proxySettings = configurationUtilities.getProxySettings();
  const customHostSettings = configurationUtilities.getCustomHostSettings(url);

  return getCustomAgentsHelper({
    customHostSettings,
    logger,
    proxySettings,
    sslOverrides,
    sslSettings: generalSSLSettings,
    url,
  });
}
