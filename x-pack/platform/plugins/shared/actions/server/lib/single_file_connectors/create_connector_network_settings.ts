/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSrv } from 'node:dns/promises';
import { getNodeSSLOptions } from '@kbn/actions-utils';
import type { ConnectorNetworkSettings } from '@kbn/connector-specs';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import { AllowlistDeniedError } from './connector_network_errors';

const toAllowlistDeniedError = (err: unknown): never => {
  throw new AllowlistDeniedError(err instanceof Error ? err.message : String(err), { cause: err });
};

export const createConnectorNetworkSettings = (
  configUtils: ActionsConfigurationUtilities
): ConnectorNetworkSettings => ({
  ensureUriAllowed: (url) => {
    try {
      configUtils.ensureUriAllowed(url);
    } catch (err) {
      toAllowlistDeniedError(err);
    }
  },
  ensureHostnameAllowed: (host) => {
    try {
      configUtils.ensureHostnameAllowed(host);
    } catch (err) {
      toAllowlistDeniedError(err);
    }
  },
  resolveSrvHosts: (name, serviceName = 'mongodb') => resolveSrv(`_${serviceName}._tcp.${name}`),
  getSslSettings: () => configUtils.getSSLSettings(),
  getProxySettings: () => configUtils.getProxySettings(),
  getCustomHostSettings: (url) => configUtils.getCustomHostSettings(url),
  getResponseSettings: () => configUtils.getResponseSettings(),
  getTlsOptions: (logger, verificationMode, sslOverrides) =>
    getNodeSSLOptions(logger, verificationMode, sslOverrides),
});
