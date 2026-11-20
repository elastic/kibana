/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';
import axios from 'axios';

/**
 * True when a Cloud API request failed before any HTTP response came back: DNS failures,
 * timeouts, refused or reset connections and TLS handshake errors all end up here.
 */
export const isCloudApiNetworkError = (error: unknown): error is AxiosError =>
  axios.isAxiosError(error) && !error.response;

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
  `Kibana couldn't reach ${url}. Check that outbound HTTPS from the Kibana server to Elastic Cloud isn't blocked by a firewall or proxy.`;

export const getCloudApiUnauthorizedMessage = (url: string): string =>
  `The API key was rejected by ${url} (HTTP 401). Check that the key is valid and not expired. If it is, a proxy between Kibana and Elastic Cloud may be intercepting the request.`;
