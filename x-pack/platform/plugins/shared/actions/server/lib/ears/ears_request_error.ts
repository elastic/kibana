/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EARS_REQUEST_ID_HEADER = 'x-cloud-request-id';
const MAX_EARS_REQUEST_ID_LENGTH = 128;

/**
 * Reads the request id the ingress proxy assigns to each request to EARS and echoes back
 * in the response. The proxy appends its own value, so when several are present the last one wins.
 */
export const getEarsRequestId = (headers: unknown): string | undefined => {
  const value = (headers as Record<string, unknown> | undefined)?.[EARS_REQUEST_ID_HEADER];
  if (typeof value !== 'string') {
    return undefined;
  }
  const lastValue = value.split(',').pop()?.trim();
  return lastValue ? lastValue.slice(0, MAX_EARS_REQUEST_ID_LENGTH) : undefined;
};

/**
 * Thrown when EARS answers a token, refresh or revoke request with a non-200 status.
 * Carries the status and request id so callers can log them without parsing the message.
 */
export class EarsRequestError extends Error {
  public readonly status: number;
  public readonly earsRequestId?: string;

  constructor({
    message,
    status,
    earsRequestId,
  }: {
    message: string;
    status: number;
    earsRequestId?: string;
  }) {
    super(message);
    this.name = 'EarsRequestError';
    this.status = status;
    this.earsRequestId = earsRequestId;
  }
}

/**
 * Returns the error for a redirect from EARS. Requests to EARS carry tokens in the body and never
 * follow redirects, so the operator has to configure a base URL that does not redirect.
 */
export const getEarsRedirectError = (
  status: number,
  earsRequestId?: string
): EarsRequestError | undefined =>
  status >= 300 && status < 400
    ? new EarsRequestError({
        message: `Auth redirect service returned a redirect (HTTP ${status}). Set xpack.actions.auth.ears.url to an EARS base URL that serves its endpoints without redirecting.`,
        status,
        earsRequestId,
      })
    : undefined;
