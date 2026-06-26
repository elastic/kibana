/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProxyAgent, type Dispatcher } from 'undici';

export interface ArtifactRepositoryProxySettings {
  proxyUrl: string;
  proxyHeaders?: Record<string, string>;
  proxyRejectUnauthorizedCertificates?: boolean;
}

interface RequestInitWithDispatcher extends RequestInit {
  dispatcher?: Dispatcher;
}

type GetProxyDispatcherParams = ArtifactRepositoryProxySettings & { targetUrl: string };

function getProxyHeaders(options: GetProxyDispatcherParams): Record<string, string> | undefined {
  if (options.proxyHeaders) {
    return options.proxyHeaders;
  }

  if (options.targetUrl.startsWith('https:')) {
    const endpointParsed = new URL(options.targetUrl);
    return {
      // the proxied URL's host is put in the header instead of the server's actual host
      Host: endpointParsed.host,
    };
  }

  return undefined;
}

function getProxyDispatcher(options: GetProxyDispatcherParams): ProxyAgent {
  const proxyParsed = new URL(options.proxyUrl);
  const authValue = proxyParsed.username
    ? `${proxyParsed.username}:${proxyParsed.password}`
    : undefined;

  const tlsOptions =
    options.proxyRejectUnauthorizedCertificates === false
      ? { rejectUnauthorized: false as const }
      : undefined;

  const headers = getProxyHeaders(options);

  return new ProxyAgent({
    uri: options.proxyUrl,
    ...(authValue ? { auth: authValue } : {}),
    ...(headers ? { headers } : {}),
    ...(tlsOptions ? { proxyTls: tlsOptions, requestTls: tlsOptions } : {}),
  });
}

/**
 * Get fetch options for making HTTP requests.
 * If proxyUrl is defined, use it as a proxy for requests to targetUrl.
 * If proxyUrl is not defined, return empty options (direct request to targetUrl).
 */
export function getFetchOptions(targetUrl: string, proxyUrl?: string): RequestInitWithDispatcher {
  if (!proxyUrl) {
    return {};
  }

  return {
    dispatcher: getProxyDispatcher({ proxyUrl, targetUrl }),
  };
}
