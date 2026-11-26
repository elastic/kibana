/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nodeFetch, { Headers } from 'node-fetch';
import type { RequestInfo, RequestInit, Response } from 'node-fetch';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { getCustomAgents } from './get_custom_agents';
import { isSameOriginRedirect, removeCrossOriginUnsafeHeaders } from './redirect_headers';

const MAX_REDIRECTS = 20;
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

export type NodeFetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>;

interface CreateRedirectSafeFetchOpts {
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
  fetch?: NodeFetch;
}

const toUrlString = (url: RequestInfo): string => {
  if (typeof url === 'string') {
    return url;
  }
  if ('href' in url) {
    return url.href;
  }
  throw new Error('Connector fetch only supports URL strings and URL objects');
};

// RFC 9110 15.4: 303 turns any method but GET/HEAD into GET, and clients turn POST into GET on 301/302.
const changesToGet = (status: number, method: string): boolean =>
  (status === 303 && method !== 'GET' && method !== 'HEAD') ||
  ((status === 301 || status === 302) && method === 'POST');

const isReplayableBody = (body: RequestInit['body']): boolean =>
  body == null || typeof body === 'string' || Buffer.isBuffer(body);

const toHeaderRecord = (headers: RequestInit['headers']): Record<string, string> => {
  const record: Record<string, string> = {};
  new Headers(headers).forEach((value, name) => {
    record[name] = value;
  });
  return record;
};

/**
 * Wraps node-fetch for connector SDKs that do not use axios: every redirect hop is checked against
 * xpack.actions.allowedHosts, and a cross-origin hop keeps only headers that are safe to send to another host.
 */
export const createRedirectSafeFetch = ({
  configurationUtilities,
  logger,
  fetch = nodeFetch,
}: CreateRedirectSafeFetchOpts): NodeFetch => {
  const follow = async (
    url: string,
    init: RequestInit,
    redirectCount: number
  ): Promise<Response> => {
    const response = await fetch(url, { ...init, redirect: 'manual' });
    const location = response.headers.get('location');
    if (!REDIRECT_STATUSES.has(response.status) || location == null) {
      return response;
    }

    // Free the socket; the redirect response body is never read.
    response.body?.resume?.();

    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error(`Maximum number of redirects (${MAX_REDIRECTS}) exceeded`);
    }

    const nextUrl = new URL(location, url).toString();
    configurationUtilities.ensureUriAllowed(nextUrl);

    const method = (init.method ?? 'GET').toUpperCase();
    const headers = toHeaderRecord(init.headers);
    const next: RequestInit = { ...init, headers };

    if (changesToGet(response.status, method)) {
      next.method = 'GET';
      delete next.body;
      for (const name of Object.keys(headers).filter((header) => header.startsWith('content-'))) {
        delete headers[name];
      }
    } else if (!isReplayableBody(init.body)) {
      throw new Error(`Cannot resend a streamed request body after a ${response.status} redirect`);
    }

    if (new URL(url).origin !== new URL(nextUrl).origin) {
      // The original agent carries proxy and TLS settings (including client certificates) for the
      // original host, so the new origin gets the agent configured for it.
      const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, nextUrl);
      next.agent = nextUrl.startsWith('https:') ? httpsAgent : httpAgent;
    }

    if (!isSameOriginRedirect(url, nextUrl)) {
      const removed = removeCrossOriginUnsafeHeaders(headers);
      if (removed.length > 0) {
        logger.debug(
          `Removed headers [${removed.join(
            ', '
          )}] from a connector request redirected to another origin (${new URL(nextUrl).hostname})`
        );
      }
    }

    return follow(nextUrl, next, redirectCount + 1);
  };

  return async (url, init) => {
    const urlString = toUrlString(url);
    configurationUtilities.ensureUriAllowed(urlString);
    return follow(urlString, init ?? {}, 0);
  };
};
