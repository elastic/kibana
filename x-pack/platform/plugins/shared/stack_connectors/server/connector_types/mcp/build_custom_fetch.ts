/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, ProxyAgent, type Dispatcher } from 'undici';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { FetchLike } from '@kbn/mcp-client';
import type { CustomHostSettings, ProxySettings, SSLSettings } from '@kbn/actions-utils';

interface TlsConnectOptions {
  rejectUnauthorized?: boolean;
  checkServerIdentity?: () => undefined;
  ca?: string | Buffer;
}

/**
 * Maps `verificationMode` to TLS connect options, mirroring
 * the logic in `getNodeSSLOptions` from `@kbn/actions-utils`.
 */
function getTlsOptionsFromVerificationMode(
  logger: Logger,
  verificationMode?: string
): Pick<TlsConnectOptions, 'rejectUnauthorized' | 'checkServerIdentity'> {
  switch (verificationMode) {
    case undefined:
      return {};
    case 'none':
      return { rejectUnauthorized: false };
    case 'certificate':
      return { rejectUnauthorized: true, checkServerIdentity: () => undefined };
    case 'full':
      return { rejectUnauthorized: true };
    default:
      logger.warn(`Unknown ssl verificationMode: ${verificationMode}`);
      return { rejectUnauthorized: true };
  }
}

/**
 * Builds TLS connect options from global SSL settings plus optional
 * per-host overrides from `customHostSettings`.
 *
 * Mirrors the logic in `getCustomAgents` from `@kbn/actions-utils`:
 * - Global `verificationMode` sets the base `rejectUnauthorized` / `checkServerIdentity`
 * - Per-host `certificateAuthoritiesData` overrides `ca`
 * - Per-host `verificationMode` overrides `rejectUnauthorized` / `checkServerIdentity`
 */
function buildTlsConnectOptions(
  logger: Logger,
  sslSettings: SSLSettings,
  customHostSettings?: CustomHostSettings
): TlsConnectOptions {
  const options: TlsConnectOptions = {
    ...getTlsOptionsFromVerificationMode(logger, sslSettings.verificationMode),
  };

  const hostSsl = customHostSettings?.ssl;
  if (hostSsl) {
    logger.debug(`Creating customized connection settings for: ${customHostSettings.url}`);

    if (hostSsl.certificateAuthoritiesData) {
      options.ca = hostSsl.certificateAuthoritiesData;
    }
    if (hostSsl.verificationMode) {
      Object.assign(options, getTlsOptionsFromVerificationMode(logger, hostSsl.verificationMode));
    }
  }

  return options;
}

/**
 * Determines whether a proxy should be used for the given target URL,
 * based on `proxyBypassHosts` and `proxyOnlyHosts` configuration.
 */
function shouldUseProxy(logger: Logger, proxySettings: ProxySettings, targetUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    logger.warn(
      `error determining proxy state for invalid url "${targetUrl}", using direct connection`
    );
    return false;
  }

  const { hostname } = parsed;

  if (proxySettings.proxyBypassHosts?.has(hostname)) {
    return false;
  }
  if (proxySettings.proxyOnlyHosts && !proxySettings.proxyOnlyHosts.has(hostname)) {
    return false;
  }

  return true;
}

/**
 * Builds a custom `fetch` implementation that applies the SSL/TLS
 * and proxy settings from the actions plugin configuration.
 *
 * This allows the MCP connector to respect the same `xpack.actions.ssl`,
 * `xpack.actions.customHostSettings`, and `xpack.actions.proxyUrl` settings
 * as all other stack connectors.
 */
export function buildCustomFetch(
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  targetUrl: string
): FetchLike {
  const sslSettings = configurationUtilities.getSSLSettings();
  const proxySettings = configurationUtilities.getProxySettings();
  const customHostSettings = configurationUtilities.getCustomHostSettings(targetUrl);

  const tlsOptions = buildTlsConnectOptions(logger, sslSettings, customHostSettings);

  let dispatcher: Dispatcher;

  if (proxySettings && shouldUseProxy(logger, proxySettings, targetUrl)) {
    let proxyUrl: URL;
    try {
      proxyUrl = new URL(proxySettings.proxyUrl);
    } catch {
      logger.warn(`invalid proxy URL "${proxySettings.proxyUrl}" ignored, using direct connection`);
      dispatcher = new Agent({ connect: tlsOptions });

      return createFetchWithDispatcher(dispatcher);
    }

    logger.debug(`MCP connector: using proxy ${proxySettings.proxyUrl} for ${targetUrl}`);

    const proxyTls = getTlsOptionsFromVerificationMode(
      logger,
      proxySettings.proxySSLSettings.verificationMode
    );

    dispatcher = new ProxyAgent({
      uri: proxyUrl.toString(),
      requestTls: tlsOptions,
      proxyTls,
      headers: proxySettings.proxyHeaders,
    });
  } else {
    dispatcher = new Agent({ connect: tlsOptions });
  }

  return createFetchWithDispatcher(dispatcher);
}

function createFetchWithDispatcher(dispatcher: Dispatcher): FetchLike {
  return (url: string | URL, init?: RequestInit): Promise<Response> => {
    return fetch(url, {
      ...init,
      // Node.js's built-in fetch (undici) supports `dispatcher` as a non-standard option
      dispatcher,
    } as RequestInit);
  };
}
