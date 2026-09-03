/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { HttpSelfService, KibanaRequest } from '@kbn/core-http-server';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { toSelfFetchQuery } from './query_params';
import { isRecord } from './types';
import type { ApiRequest } from './types';

export interface DispatchApiRequestParams {
  target: ApiTarget;
  apiRequest: ApiRequest;
  esClient: IScopedClusterClient;
  selfClient: HttpSelfService;
  request: KibanaRequest;
}

const toNdjsonBody = (lines: readonly unknown[]): string =>
  lines.map((line) => `${typeof line === 'string' ? line : JSON.stringify(line)}\n`).join('');

/**
 * Sends a prepared API request to its backend on behalf of the current user.
 *
 * @param params - The target, the prepared request, and the clients to reach each backend with.
 * @returns The raw response body.
 * @throws when the backend rejects the call. Use {@link getFailureDetails} to read the status
 * code and body off the thrown error.
 */
export const dispatchApiRequest = async ({
  target,
  apiRequest,
  esClient,
  selfClient,
  request,
}: DispatchApiRequestParams): Promise<unknown> => {
  const { method, path, querystring, body, bulkBody } = apiRequest;

  if (target === 'kibana') {
    return selfClient.asScoped(request).fetch(path, {
      method,
      query: toSelfFetchQuery(querystring),
      body,
      access: path.startsWith('/internal') ? 'internal' : 'public',
    });
  }

  const transportParams: Parameters<typeof esClient.asCurrentUser.transport.request>[0] = {
    method,
    path,
  };

  if (querystring != null) {
    transportParams.querystring = querystring;
  }
  if (Array.isArray(bulkBody)) {
    transportParams.bulkBody = toNdjsonBody(bulkBody);
  } else if (isRecord(body)) {
    transportParams.body = body;
  }

  return esClient.asCurrentUser.transport.request(transportParams);
};

export interface ApiFailureDetails {
  statusCode?: number;
  body?: unknown;
}

/**
 * Reads the response status and body off an error thrown by {@link dispatchApiRequest}.
 *
 * Kibana and Elasticsearch clients shape their errors differently, so both are handled here.
 *
 * @param error - The thrown value.
 * @returns Whichever of the status code and response body could be recovered.
 */
export const getFailureDetails = (error: unknown): ApiFailureDetails => {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const details: ApiFailureDetails = {};
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    details.statusCode = error.statusCode;
  } else if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    details.statusCode = error.response.status;
  }
  if ('body' in error && error.body !== undefined) {
    details.body = error.body;
  }
  return details;
};
