/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSrv } from 'node:dns/promises';
import { getNodeSSLOptions } from '@kbn/actions-utils';
import type { ConnectorNetworkSettings, PlatformServices } from '@kbn/connector-specs';
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
  getSslSettings: () => configUtils.getSSLSettings(),
  getProxySettings: () => configUtils.getProxySettings(),
  getCustomHostSettings: (url) => configUtils.getCustomHostSettings(url),
  getResponseSettings: () => configUtils.getResponseSettings(),
});

export const createPlatformServices = (
  configUtils: ActionsConfigurationUtilities
): PlatformServices => ({
  resolveSrvHosts: (name, serviceName) => resolveSrv(`_${serviceName}._tcp.${name}`),

  buildTlsOptions: (targets, logger) => {
    const sslSettings = configUtils.getSSLSettings();
    // xpack.actions.customHostSettings entries are keyed by https://<host>:<port> — "https:" is
    // used as a generic TCP+TLS placeholder scheme, not a real HTTP request.
    const customHostSsls = targets.flatMap(({ hostname, port }) => {
      const ssl = configUtils.getCustomHostSettings(`https://${hostname}:${port}`)?.ssl;
      return ssl != null ? [ssl] : [];
    });
    if (customHostSsls.length > 1) {
      throw new Error(
        'MongoDB connector: multiple hosts in the connection URI have conflicting ' +
          'xpack.actions.customHostSettings entries. All replica-set members must share ' +
          'the same custom TLS policy, or use the global xpack.actions.ssl settings instead.'
      );
    }
    const customHostSsl = customHostSsls[0];
    // A per-host certificateAuthoritiesData applies to the entire MongoClient (one TLS config
    // for all connections). If only some targets have a matching entry, the replaced CA would
    // not validate the other members' certificates.
    if (
      customHostSsl?.certificateAuthoritiesData != null &&
      targets.length > customHostSsls.length
    ) {
      throw new Error(
        'MongoDB connector: a certificateAuthoritiesData entry in xpack.actions.customHostSettings ' +
          'cannot be applied to only some members of a multi-host connection. Configure the custom CA ' +
          'in xpack.actions.ssl so it applies to all replica-set members, or add a matching ' +
          'customHostSettings entry for every host in the connection URI.'
      );
    }
    const tlsOptions = getNodeSSLOptions(
      logger,
      customHostSsl?.verificationMode ?? sslSettings.verificationMode,
      sslSettings
    );
    if (customHostSsl?.certificateAuthoritiesData) {
      tlsOptions.ca = Buffer.from(customHostSsl.certificateAuthoritiesData);
    }
    return tlsOptions;
  },
});
