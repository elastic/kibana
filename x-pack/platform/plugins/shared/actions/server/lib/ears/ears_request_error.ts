/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EARS_REQUEST_ID_HEADER = 'x-cloud-request-id';

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
  return lastValue || undefined;
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
