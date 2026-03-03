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
  cert?: Buffer;
  key?: Buffer;
  pfx?: Buffer;
  passphrase?: string;
}

/**
 * Maps `verificationMode` to TLS connect options, mirroring
 * the logic in `getNodeSSLOptions` from `@kbn/actions-utils`.
 */
function getTlsOptionsFromVerificationMode(
  verificationMode?: string
): Pick<TlsConnectOptions, 'rejectUnauthorized' | 'checkServerIdentity'> {
  switch (verificationMode) {
    case 'none':
      return { rejectUnauthorized: false };
    case 'certificate':
      return { rejectUnauthorized: true, checkServerIdentity: () => undefined };
    case 'full':
      return { rejectUnauthorized: true };
    default:
      return {};
  }
}

/**
 * Builds TLS connect options from global SSL settings plus optional
 * per-host overrides from `customHostSettings`.
 */
function buildTlsConnectOptions(
  sslSettings: SSLSettings,
  customHostSettings?: CustomHostSettings
): TlsConnectOptions {
  const options: TlsConnectOptions = {
    ...getTlsOptionsFromVerificationMode(sslSettings.verificationMode),
  };

  if (sslSettings.ca) {
    options.ca = sslSettings.ca;
  }
  if (sslSettings.cert) {
    options.cert = sslSettings.cert;
  }
  if (sslSettings.key) {
    options.key = sslSettings.key;
  }
  if (sslSettings.pfx) {
    options.pfx = sslSettings.pfx;
  }
  if (sslSettings.passphrase) {
    options.passphrase = sslSettings.passphrase;
  }

  const hostSsl = customHostSettings?.ssl;
  if (hostSsl) {
    if (hostSsl.certificateAuthoritiesData) {
      options.ca = hostSsl.certificateAuthoritiesData;
    }
    if (hostSsl.verificationMode) {
      Object.assign(options, getTlsOptionsFromVerificationMode(hostSsl.verificationMode));
    }
  }

  return options;
}

/**
 * Determines whether a proxy should be used for the given target URL,
 * based on `proxyBypassHosts` and `proxyOnlyHosts` configuration.
 */
function shouldUseProxy(proxySettings: ProxySettings, targetUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
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

  const tlsOptions = buildTlsConnectOptions(sslSettings, customHostSettings);

  let dispatcher: Dispatcher;

  if (proxySettings && shouldUseProxy(proxySettings, targetUrl)) {
    logger.debug(`MCP connector: using proxy ${proxySettings.proxyUrl} for ${targetUrl}`);

    const proxyTls = getTlsOptionsFromVerificationMode(
      proxySettings.proxySSLSettings.verificationMode
    );

    dispatcher = new ProxyAgent({
      uri: proxySettings.proxyUrl,
      requestTls: tlsOptions,
      proxyTls,
      headers: proxySettings.proxyHeaders,
    });
  } else {
    dispatcher = new Agent({ connect: tlsOptions });
  }

  return (url: string | URL, init?: RequestInit): Promise<Response> => {
    return fetch(url, {
      ...init,
      // Node.js's built-in fetch (undici) supports `dispatcher` as a non-standard option
      dispatcher,
    } as RequestInit);
  };
}
