/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, ProxyAgent, type Dispatcher } from 'undici';
import type { Logger } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { getNodeSSLOptions, type CustomHostSettings, type SSLSettings } from '@kbn/actions-utils';
import type {
  ConfiguredFetchFactory,
  ConfiguredFetchResource,
  FetchLike,
} from '@kbn/connector-specs';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { buildUserAgent } from './get_axios_instance';

function buildTlsConnectOptions(
  logger: Logger,
  sslSettings: SSLSettings,
  customHostSettings?: CustomHostSettings
): ReturnType<typeof getNodeSSLOptions> {
  const options = getNodeSSLOptions(logger, sslSettings.verificationMode, sslSettings);

  const hostSsl = customHostSettings?.ssl;
  if (hostSsl) {
    logger.debug(`Creating customized connection settings for: ${customHostSettings.url}`);
    if (hostSsl.certificateAuthoritiesData) {
      options.ca = Buffer.from(hostSsl.certificateAuthoritiesData);
    }
    if (hostSsl.verificationMode) {
      delete options.checkServerIdentity;
      Object.assign(options, getNodeSSLOptions(logger, hostSsl.verificationMode));
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
  const { timeout } = configurationUtilities.getResponseSettings();
  const customHostSettings = configurationUtilities.getCustomHostSettings(targetUrl);
  const tlsOptions = buildTlsConnectOptions(logger, sslSettings, customHostSettings);
  const timeoutOptions = timeout > 0 ? { headersTimeout: timeout, bodyTimeout: timeout } : {};

  if (proxySettings && shouldUseProxy(logger, proxySettings, targetUrl)) {
    let proxyUrl: URL;
    try {
      proxyUrl = new URL(proxySettings.proxyUrl);
    } catch {
      logger.warn(`invalid proxy URL "${proxySettings.proxyUrl}" ignored, using direct connection`);
      return new Agent({ connect: tlsOptions, ...timeoutOptions });
    }

    const proxyTls = getNodeSSLOptions(
      logger,
      proxySettings.proxySSLSettings.verificationMode,
      proxySettings.proxySSLSettings
    );

    return new ProxyAgent({
      uri: proxyUrl.toString(),
      requestTls: tlsOptions,
      proxyTls,
      headers: proxySettings.proxyHeaders,
      ...timeoutOptions,
    });
  }

  return new Agent({ connect: tlsOptions, ...timeoutOptions });
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

const enforceResponseContentLength = (response: Response, maxContentLength: number): Response => {
  const contentType = response.headers.get('content-type') ?? '';
  if (maxContentLength <= 0 || contentType.includes(SSE_CONTENT_TYPE)) {
    return response;
  }

  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > maxContentLength) {
      void response.body?.cancel();
      throw new Error(
        `Response content length ${contentLength} exceeds limit of ${maxContentLength}`
      );
    }
  }

  if (!response.body) {
    return response;
  }

  let receivedBytes = 0;
  const limitedBody = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        receivedBytes += chunk.byteLength;
        if (receivedBytes > maxContentLength) {
          controller.error(
            new Error(
              `Response content length ${receivedBytes} exceeds limit of ${maxContentLength}`
            )
          );
          return;
        }
        controller.enqueue(chunk);
      },
    })
  );

  const limitedResponse = new Response(limitedBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  Object.defineProperties(limitedResponse, {
    url: { value: response.url },
    redirected: { value: response.redirected },
    type: { value: response.type },
  });
  return limitedResponse;
};

/**
 * Creates a `ConfiguredFetchResource` for a given target URL.
 *
 * The resource owns a cache of Undici dispatchers (keyed by destination origin).
 * Dispatchers are built lazily on first request to a destination and reused within the same
 * resource lifetime. Call `close()` when the resource is no longer needed so all open sockets
 * are released.
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
    const origin = new URL(url).origin;
    let dispatcher = dispatchers.get(origin);
    if (!dispatcher) {
      dispatcher = buildDispatcherForUrl(configurationUtilities, logger, url);
      dispatchers.set(origin, dispatcher);
    }
    return dispatcher;
  };

  const followRedirects = async (
    url: string | URL,
    init?: RequestInit,
    redirectCount = 0
  ): Promise<Response> => {
    if (closed) {
      throw new Error('Configured fetch resource is closed.');
    }

    const urlStr = typeof url === 'string' ? url : url.toString();
    const dispatcher = getOrCreateDispatcher(urlStr);

    const requestHeaders = new Headers(init?.headers);
    if (!requestHeaders.has('user-agent')) {
      requestHeaders.set('user-agent', userAgent);
    }

    // Build abort signals: request signal + optional timeout
    const signals: AbortSignal[] = [];
    if (init?.signal) {
      signals.push(init.signal as AbortSignal);
    }
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    if (timeout > 0) {
      const controller = new AbortController();
      timeoutHandle = setTimeout(() => {
        controller.abort(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
      signals.push(controller.signal);
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
      return enforceResponseContentLength(response, maxContentLength);
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
    const redirectInit: RequestInit = { ...init, headers: requestHeaders };

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

  const fetchFn: FetchLike = async (url, init) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    configurationUtilities.ensureUriAllowed(urlString);
    const headers = new Headers(defaultHeaders);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    return followRedirects(urlString, { ...init, headers });
  };

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
