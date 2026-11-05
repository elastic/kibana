/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ERROR_DETAILS_LENGTH = 500;

export interface HttpRequest {
  method: string;
  url: URL;
  body?: string;
}

export type JsonRequest = <T = unknown>(
  method: string,
  path: string,
  options?: { body?: object; onNotFound?: () => Error }
) => Promise<T>;

/** Creates a JSON client for a memory service, with a timeout and service-named errors. */
export const createJsonClient = ({
  serviceName,
  baseUrl,
  getHeaders,
}: {
  serviceName: string;
  baseUrl: string;
  getHeaders: (request: HttpRequest) => Record<string, string>;
}): JsonRequest => {
  return async <T>(
    method: string,
    path: string,
    { body, onNotFound }: { body?: object; onNotFound?: () => Error } = {}
  ): Promise<T> => {
    const request: HttpRequest = {
      method,
      url: new URL(path, baseUrl),
      body: body === undefined ? undefined : JSON.stringify(body),
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(request.url, {
        method,
        headers: {
          ...(request.body !== undefined && { 'Content-Type': 'application/json' }),
          ...getHeaders(request),
        },
        body: request.body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 404 && onNotFound) {
      throw onNotFound();
    }
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `${serviceName} ${method} ${path} failed with ${response.status}: ${text.slice(
          0,
          MAX_ERROR_DETAILS_LENGTH
        )}`
      );
    }
    return (text ? JSON.parse(text) : undefined) as T;
  };
};
