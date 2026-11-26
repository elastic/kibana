/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosRequestConfig } from 'axios';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';

/**
 * Headers that are kept when a redirect leaves the original origin. Everything else is dropped,
 * because connectors send credentials in many differently named headers (Api-Key, X-Routing-Key,
 * user-defined secret headers, ...) and a denylist cannot name them all.
 */
const CROSS_ORIGIN_SAFE_HEADERS: ReadonlySet<string> = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'content-encoding',
  'content-language',
  'content-length',
  'content-type',
  'pragma',
  'user-agent',
]);

interface RedirectOptions {
  hostname?: unknown;
  href?: unknown;
  headers?: Record<string, unknown>;
}

interface RedirectRequestDetails {
  url?: string;
}

const isUpgradeToHttps = (from: URL, to: URL): boolean =>
  from.protocol === 'http:' &&
  to.protocol === 'https:' &&
  from.hostname === to.hostname &&
  from.port === '' &&
  to.port === '';

const isSameOrigin = (fromUrl: string | undefined, toUrl: unknown): boolean => {
  if (typeof fromUrl !== 'string' || typeof toUrl !== 'string') {
    return false;
  }
  try {
    const from = new URL(fromUrl);
    const to = new URL(toUrl);
    return from.origin === to.origin || isUpgradeToHttps(from, to);
  } catch {
    // An unparsable URL is treated as cross-origin, which drops the headers.
    return false;
  }
};

const stripUnsafeHeaders = (headers: Record<string, unknown>): string[] => {
  const removed = Object.keys(headers).filter(
    (name) => !CROSS_ORIGIN_SAFE_HEADERS.has(name.toLowerCase())
  );
  for (const name of removed) {
    delete headers[name];
  }
  return removed;
};

/**
 * Returns the follow-redirects hook used by connector HTTP requests: it rejects redirects to hosts
 * outside xpack.actions.allowedHosts and drops all but a few safe headers on cross-origin redirects.
 */
export const getBeforeRedirectFn = (
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger
): NonNullable<AxiosRequestConfig['beforeRedirect']> => {
  return (
    options: RedirectOptions,
    _responseDetails?: unknown,
    requestDetails?: RedirectRequestDetails
  ) => {
    const { hostname, href, headers } = options;
    if (hostname == null) {
      throw new Error('redirect hostname not provided by axios');
    }

    if (typeof hostname !== 'string') {
      throw new Error('redirect hostname provided by axios was not a string');
    }

    configurationUtilities.ensureHostnameAllowed(hostname);

    if (headers == null || isSameOrigin(requestDetails?.url, href)) {
      return;
    }

    const removed = stripUnsafeHeaders(headers);
    if (removed.length > 0) {
      logger.debug(
        `Removed headers [${removed.join(
          ', '
        )}] from a connector request redirected to another origin (${hostname})`
      );
    }
  };
};
