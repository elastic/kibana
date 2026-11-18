/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorExecuteFailureClass } from '../../../common';
import { AllowlistDeniedError } from './connector_network_errors';

interface AxiosLikeError {
  code?: unknown;
  request?: { res?: unknown };
  response?: { status?: unknown };
  /** Transports that aren't axios put the status at the top level, as Relay's errors do. */
  statusCode?: unknown;
}

/**
 * Error codes for a request that never produced a response: DNS, TLS, refused or reset
 * connections, and the codes axios uses for its own timeout and transport failures.
 */
const NETWORK_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'EPROTO',
  'ETIMEDOUT',
  'ERR_CANCELED',
  'ERR_NETWORK',
]);

/** The HTTP status an axios error carries, used for `errorMeta` and the retry date. */
export const getHttpStatus = (error: unknown): number | undefined => {
  const status = (error as AxiosLikeError | undefined)?.response?.status;
  return typeof status === 'number' ? status : undefined;
};

/**
 * The status the vendor answered with, over any transport a connector can use: axios puts it on
 * the response, while Relay's `RelayRequestError` carries it at the top level. Kept separate
 * from `getHttpStatus` so classifying a failure doesn't change `errorMeta` or the retry date.
 */
const getVendorStatus = (error: unknown): number | undefined => {
  const fromResponse = getHttpStatus(error);
  if (fromResponse !== undefined) return fromResponse;

  const { statusCode } = (error ?? {}) as AxiosLikeError;
  return typeof statusCode === 'number' ? statusCode : undefined;
};

/**
 * Whether the vendor answered at all. `request.res` is the raw response, which axios attaches
 * for errors raised after the reply arrived, such as a body over `maxContentLength`.
 */
const hasResponse = (error: unknown): boolean => {
  const { response, request } = (error ?? {}) as AxiosLikeError;
  return (response ?? request?.res) != null;
};

const isNetworkError = (error: unknown): boolean => {
  // An allowlist denial never leaves Kibana, but like a refused connection it means the
  // request didn't reach the vendor, and it is not a bug in the connector's code.
  if (error instanceof AllowlistDeniedError) return true;

  const { code, request } = (error ?? {}) as AxiosLikeError;
  if (typeof code === 'string' && NETWORK_ERROR_CODES.has(code)) return true;

  // A request went out and nothing came back.
  return request != null && !hasResponse(error);
};

/**
 * Tells a vendor's rejection apart from a vendor outage, an unreachable vendor, and a bug in
 * the connector's own code, so a rise in connector bugs can be seen in telemetry.
 *
 * Only called for failures the connector returns; failures the framework handles itself
 * (authorization, rate limiting, disabled connectors, invalid config) never reach here.
 */
export const classifyConnectorFailure = (error: unknown): ConnectorExecuteFailureClass => {
  const status = getVendorStatus(error);

  if (status !== undefined) {
    if (status >= 500) return 'vendor_5xx';
    if (status >= 400) return 'vendor_4xx';
    // A response outside the error ranges means the handler threw for a reason of its own.
    return 'handler';
  }

  return isNetworkError(error) ? 'network' : 'handler';
};
