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
 * as all other stack connectors. Redirect responses are followed manually
 * so that each hop is validated against `xpack.actions.allowedHosts`.
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

      return createFetchWithDispatcher(dispatcher, configurationUtilities, logger);
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

  return createFetchWithDispatcher(dispatcher, configurationUtilities, logger);
}

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

// WHATWG Fetch specification constants
const MAX_REDIRECTS = 20;
const BLOCKED_CROSS_ORIGIN_HEADERS = ['authorization']; // spec also mentions 'cookie', 'proxy-authorization', 'host'. Not applicable here
const STRIPPED_METHOD_CHANGE_HEADERS = [
  'content-encoding',
  'content-language',
  'content-location',
  'content-type',
];

function createFetchWithDispatcher(
  dispatcher: Dispatcher,
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger
): FetchLike {
  const followRedirects = async (
    url: string | URL,
    init?: RequestInit,
    redirectCount = 0
  ): Promise<Response> => {
    const response = await fetch(url, {
      ...init,
      redirect: 'manual',
      dispatcher,
    } as RequestInit);

    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return response;
    }

    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error(`Max redirects (${MAX_REDIRECTS}) exceeded`);
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error(`Redirect response ${response.status} missing Location header`);
    }

    const resolvedUrl = new URL(location, url).toString();

    configurationUtilities.ensureUriAllowed(resolvedUrl);
    logger.debug(`MCP connector: following redirect (${response.status}) to ${resolvedUrl}`);

    // undici explicitly recommends reading/cancelling the body to free up resources
    try {
      await response.body?.cancel();
    } catch {
      // body may be already cancelled or not readable, ignore
    }

    const preserveMethod = response.status === 307 || response.status === 308;
    const redirectInit: RequestInit = { ...init };

    if (!preserveMethod) {
      const sanitizedHeaders = new Headers(redirectInit.headers);
      STRIPPED_METHOD_CHANGE_HEADERS.forEach((header) => sanitizedHeaders.delete(header));

      redirectInit.headers = sanitizedHeaders;
      redirectInit.method = 'GET';
      delete redirectInit.body;
    }

    // Per WHATWG Fetch, strip authorization header on cross-origin redirects
    const requestOrigin = new URL(url).origin;
    const redirectOrigin = new URL(resolvedUrl).origin;
    if (requestOrigin !== redirectOrigin && redirectInit.headers) {
      const sanitizedHeaders = new Headers(redirectInit.headers);
      BLOCKED_CROSS_ORIGIN_HEADERS.forEach((header) => sanitizedHeaders.delete(header));
      redirectInit.headers = sanitizedHeaders;
    }

    return followRedirects(resolvedUrl, redirectInit, redirectCount + 1);
  };

  return (url: string | URL, init?: RequestInit): Promise<Response> => followRedirects(url, init);
}
