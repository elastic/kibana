/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, ProxyAgent, type Dispatcher } from 'undici';
import type { Logger } from '@kbn/core/server';
import type { CustomHostSettings, ProxySettings, SSLSettings } from '@kbn/actions-utils';

import type { ActionsConfigurationUtilities } from '../actions_config';

export type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

interface TlsConnectOptions {
  rejectUnauthorized?: boolean;
  checkServerIdentity?: () => undefined;
  ca?: string | Buffer;
}

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

function createFetchWithDispatcher(dispatcher: Dispatcher): FetchLike {
  return (url: string | URL, init?: RequestInit): Promise<Response> => {
    return fetch(url, {
      ...init,
      dispatcher,
    } as RequestInit);
  };
}

/**
 * Builds a custom `fetch` that applies the SSL/TLS and proxy settings from
 * the actions plugin configuration. Allows non-Axios transports (e.g. the MCP
 * SDK's StreamableHTTPClientTransport) to respect the same
 * `xpack.actions.ssl`, `xpack.actions.customHostSettings`, and
 * `xpack.actions.proxyUrl` settings as all other stack connectors.
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

    logger.debug(`Using proxy ${proxySettings.proxyUrl} for ${targetUrl}`);

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
