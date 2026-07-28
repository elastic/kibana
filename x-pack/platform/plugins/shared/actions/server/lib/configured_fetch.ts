/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, ProxyAgent, type Dispatcher } from 'undici';
import type { Logger } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CustomHostSettings, SSLSettings } from '@kbn/actions-utils';
import type {
  ConfiguredFetchFactory,
  ConfiguredFetchResource,
  FetchLike,
} from '@kbn/connector-specs';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { buildUserAgent } from './get_axios_instance';

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

function shouldUseProxy(
  logger: Logger,
  proxySettings: { proxyBypassHosts?: Set<string>; proxyOnlyHosts?: Set<string>; proxyUrl: string },
  targetUrl: string
): boolean {
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

function buildDispatcherForUrl(
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  targetUrl: string
): Dispatcher {
  const sslSettings = configurationUtilities.getSSLSettings();
  const proxySettings = configurationUtilities.getProxySettings();
  const customHostSettings = configurationUtilities.getCustomHostSettings(targetUrl);
  const tlsOptions = buildTlsConnectOptions(logger, sslSettings, customHostSettings);

  if (proxySettings && shouldUseProxy(logger, proxySettings, targetUrl)) {
    let proxyUrl: URL;
    try {
      proxyUrl = new URL(proxySettings.proxyUrl);
    } catch {
      logger.warn(`invalid proxy URL "${proxySettings.proxyUrl}" ignored, using direct connection`);
      return new Agent({ connect: tlsOptions });
    }

    const proxyTls = getTlsOptionsFromVerificationMode(
      logger,
      proxySettings.proxySSLSettings.verificationMode
    );

    return new ProxyAgent({
      uri: proxyUrl.toString(),
      requestTls: tlsOptions,
      proxyTls,
      headers: proxySettings.proxyHeaders,
    });
  }

  return new Agent({ connect: tlsOptions });
}

/**
 * Builds a policy-key string for the given URL so that two URLs that share
 * the same TLS and proxy settings share the same cached dispatcher.
 */
function buildDispatcherPolicyKey(
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  targetUrl: string
): string {
  const sslSettings = configurationUtilities.getSSLSettings();
  const proxySettings = configurationUtilities.getProxySettings();
  const customHostSettings = configurationUtilities.getCustomHostSettings(targetUrl);
  const tlsOptions = buildTlsConnectOptions(logger, sslSettings, customHostSettings);

  let proxyUrl: string | undefined;
  if (proxySettings && shouldUseProxy(logger, proxySettings, targetUrl)) {
    proxyUrl = proxySettings.proxyUrl;
  }

  return JSON.stringify({ tlsOptions, proxyUrl });
}

/**
 * Merges multiple AbortSignals into one that aborts when any of the sources abort.
 */
function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 20;
const BLOCKED_CROSS_ORIGIN_HEADERS = ['authorization'];
const STRIPPED_METHOD_CHANGE_HEADERS = [
  'content-encoding',
  'content-language',
  'content-location',
  'content-type',
];

const SSE_CONTENT_TYPE = 'text/event-stream';

/**
 * Creates a `ConfiguredFetchResource` for a given target URL.
 *
 * The resource owns a cache of Undici dispatchers (keyed by the combined TLS/proxy
 * policy for each destination).  Dispatchers are built lazily on first request to
 * a new host-policy combination and reused across all requests within the same
 * resource lifetime.  Call `close()` when the resource is no longer needed so that
 * all open sockets are released.
 */
function createConfiguredFetchResource(
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  cloud: CloudSetup | undefined,
  targetUrl: string,
  defaultHeaders?: Readonly<Record<string, string>>
): ConfiguredFetchResource {
  // Validate the initial target URL up front so callers get an immediate error
  // rather than a deferred failure on the first network hop.
  configurationUtilities.ensureUriAllowed(targetUrl);

  const userAgent = buildUserAgent(cloud);
  const { timeout, maxContentLength } = configurationUtilities.getResponseSettings();

  const dispatchers = new Map<string, Dispatcher>();
  let closed = false;

  const getOrCreateDispatcher = (url: string): Dispatcher => {
    const key = buildDispatcherPolicyKey(configurationUtilities, logger, url);
    let d = dispatchers.get(key);
    if (!d) {
      d = buildDispatcherForUrl(configurationUtilities, logger, url);
      dispatchers.set(key, d);
    }
    return d;
  };

  const followRedirects = async (
    url: string | URL,
    init?: RequestInit,
    redirectCount = 0
  ): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const dispatcher = getOrCreateDispatcher(urlStr);

    // Merge default headers and apply User-Agent
    const requestHeaders = new Headers({
      ...(defaultHeaders ?? {}),
      ...(init?.headers instanceof Headers
        ? Object.fromEntries((init.headers as Headers).entries())
        : (init?.headers as Record<string, string> | undefined) ?? {}),
    });
    if (!requestHeaders.has('user-agent')) {
      requestHeaders.set('user-agent', userAgent);
    }

    // Build abort signals: request signal + optional timeout
    const signals: AbortSignal[] = [];
    if (init?.signal) {
      signals.push(init.signal as AbortSignal);
    }
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let timeoutController: AbortController | undefined;
    if (timeout > 0) {
      timeoutController = new AbortController();
      timeoutHandle = setTimeout(() => {
        timeoutController!.abort(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
      signals.push(timeoutController.signal);
    }

    const mergedSignal = signals.length > 0 ? mergeAbortSignals(signals) : undefined;

    let response: Response;
    try {
      response = await fetch(urlStr, {
        ...init,
        headers: requestHeaders,
        redirect: 'manual',
        ...(mergedSignal ? { signal: mergedSignal } : {}),
        dispatcher,
      } as RequestInit);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }

    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      // SSE responses are passed through as a stream; skip body size checks.
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes(SSE_CONTENT_TYPE) && maxContentLength > 0) {
        const contentLengthStr = response.headers.get('content-length');
        if (contentLengthStr !== null) {
          const contentLength = parseInt(contentLengthStr, 10);
          if (!isNaN(contentLength) && contentLength > maxContentLength) {
            throw new Error(
              `Response content length ${contentLength} exceeds limit of ${maxContentLength}`
            );
          }
        }
      }
      return response;
    }

    if (redirectCount >= MAX_REDIRECTS) {
      try {
        await response.body?.cancel();
      } catch {
        // ignore
      }
      throw new Error(`Max redirects (${MAX_REDIRECTS}) exceeded`);
    }

    const location = response.headers.get('location');
    if (!location) {
      try {
        await response.body?.cancel();
      } catch {
        // ignore
      }
      throw new Error(`Redirect response ${response.status} missing Location header`);
    }

    const resolvedUrl = new URL(location, urlStr).toString();

    // Validate each redirect destination against the allowlist.
    configurationUtilities.ensureUriAllowed(resolvedUrl);
    logger.debug(`configured-fetch: following redirect (${response.status}) to ${resolvedUrl}`);

    try {
      await response.body?.cancel();
    } catch {
      // ignore
    }

    const preserveMethod = response.status === 307 || response.status === 308;
    const redirectInit: RequestInit = { ...init };

    if (!preserveMethod) {
      const sanitizedHeaders = new Headers(redirectInit.headers);
      STRIPPED_METHOD_CHANGE_HEADERS.forEach((h) => sanitizedHeaders.delete(h));
      redirectInit.headers = sanitizedHeaders;
      redirectInit.method = 'GET';
      delete redirectInit.body;
    }

    // Per WHATWG Fetch spec: strip authorization header on cross-origin redirects.
    const requestOrigin = new URL(urlStr).origin;
    const redirectOrigin = new URL(resolvedUrl).origin;
    if (requestOrigin !== redirectOrigin) {
      const sanitizedHeaders = new Headers(redirectInit.headers);
      BLOCKED_CROSS_ORIGIN_HEADERS.forEach((h) => sanitizedHeaders.delete(h));
      redirectInit.headers = sanitizedHeaders;
    }

    return followRedirects(resolvedUrl, redirectInit, redirectCount + 1);
  };

  const fetchFn: FetchLike = (url, init) => followRedirects(url, init);

  return {
    fetch: fetchFn,
    async close(): Promise<void> {
      if (closed) {
        return;
      }
      closed = true;
      for (const [, dispatcher] of dispatchers) {
        try {
          await dispatcher.close();
        } catch {
          // ignore errors on close
        }
      }
      dispatchers.clear();
    },
  };
}

/**
 * Returns a `ConfiguredFetchFactory` that applies Kibana's actions-plugin
 * SSL/TLS, proxy, User-Agent, timeout, and body-size settings to every
 * outbound fetch request.
 *
 * The factory validates the `targetUrl` on creation, caches Undici dispatchers
 * per destination policy so that different redirect hops can use different
 * transports, and returns a `close()` method that drains all open sockets.
 */
export function buildConfiguredFetch(
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  cloud?: CloudSetup
): ConfiguredFetchFactory {
  return ({ targetUrl, headers }) =>
    createConfiguredFetchResource(configurationUtilities, logger, cloud, targetUrl, headers);
}
