/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';
import axios from 'axios';
import { i18n } from '@kbn/i18n';

/**
 * True when a Cloud API request was sent but no HTTP response came back: DNS failures,
 * timeouts, refused or reset connections and TLS handshake errors all end up here.
 * Errors axios raises before sending anything (an unsupported `cloudUrl` protocol, bad
 * options) have no `request`, so they're configuration problems and don't count.
 */
export const isCloudApiNetworkError = (error: unknown): error is AxiosError =>
  axios.isAxiosError(error) && !error.response && Boolean(error.request);

/**
 * True when an outbound proxy refused the request because Kibana's proxy credentials are
 * missing or wrong. Elastic Cloud never saw the request, so the API key isn't the problem.
 */
export const isProxyAuthenticationError = (error: unknown): error is AxiosError =>
  axios.isAxiosError(error) && error.response?.status === 407;

/**
 * Short description of an error for log lines, e.g. `ECONNRESET: socket hang up` or
 * `HTTP 401: Request failed with status code 401`. The logger doesn't print error meta
 * by default, so the cause has to be in the message itself.
 */
export const describeCloudApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const prefix = error.response ? `HTTP ${error.response.status}` : error.code;
    return prefix ? `${prefix}: ${error.message}` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
};

/**
 * Full URL of the request that failed, falling back to the given URL when axios didn't
 * record one.
 */
export const getCloudApiErrorUrl = (error: AxiosError, fallbackUrl: string): string => {
  const { baseURL = '', url } = error.config ?? {};
  if (!url) {
    return fallbackUrl;
  }
  return /^https?:\/\//.test(url) ? url : `${baseURL}${url}`;
};

export const getCloudApiUnreachableMessage = (url: string): string =>
  i18n.translate('xpack.cloudConnect.server.cloudApiUnreachableMessage', {
    defaultMessage:
      "Kibana couldn't reach {url}. Check that outbound HTTPS from the Kibana server to Elastic Cloud isn't blocked by a firewall or proxy.",
    values: { url },
  });

export const getCloudApiProxyAuthenticationMessage = (url: string): string =>
  i18n.translate('xpack.cloudConnect.server.cloudApiProxyAuthenticationMessage', {
    defaultMessage:
      'A proxy between Kibana and Elastic Cloud rejected the request to {url} (HTTP 407 Proxy Authentication Required). Check the proxy credentials configured for the Kibana server.',
    values: { url },
  });

export const getCloudApiUnauthorizedMessage = (url: string): string =>
  i18n.translate('xpack.cloudConnect.server.cloudApiUnauthorizedMessage', {
    defaultMessage:
      'The API key was rejected by {url} (HTTP 401). Check that the key is valid and not expired. If it is, a proxy between Kibana and Elastic Cloud may be intercepting the request.',
    values: { url },
  });

/**
 * Message for a Cloud API error that means Elastic Cloud was never reached (network
 * failure or proxy authentication), or `undefined` for any other error.
 */
export const getCloudApiUnreachableErrorMessage = (
  error: unknown,
  fallbackUrl: string
): string | undefined => {
  if (isCloudApiNetworkError(error)) {
    return getCloudApiUnreachableMessage(getCloudApiErrorUrl(error, fallbackUrl));
  }
  if (isProxyAuthenticationError(error)) {
    return getCloudApiProxyAuthenticationMessage(getCloudApiErrorUrl(error, fallbackUrl));
  }
  return undefined;
};
