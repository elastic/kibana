/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { EsClient } from '@kbn/es-client-plugin/public';
import { MAX_INDICES_PER_REQUEST } from '../../../common/constants';
import type { Error as EsUiError, SendRequestResponse } from '../../shared_imports';
import { esClientService } from './es_client';

export type EsCall<T> = (client: EsClient) => Promise<T>;

interface EsErrorCause {
  type?: string;
  reason?: string;
  caused_by?: EsErrorCause;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isEsUiError = (value: unknown): value is EsUiError =>
  isObject(value) && typeof value.error === 'string' && typeof value.message === 'string';

const getCauses = (cause?: EsErrorCause): string[] => {
  const next = cause?.caused_by;
  if (!next) {
    return [];
  }
  return [next.reason ?? '', ...getCauses(next)].filter(Boolean);
};

/**
 * Converts a failed proxy response into the error body Kibana routes return via `handleEsError`.
 */
export const toEsUiError = ({ body, response, message }: IHttpFetchError): EsUiError => {
  if (isEsUiError(body)) {
    return body;
  }
  const esError = isObject(body) ? body.error : undefined;
  const cause: EsErrorCause | undefined = isObject(esError) ? esError : undefined;
  const reason = typeof esError === 'string' ? esError : cause?.reason || cause?.caused_by?.reason;

  return {
    statusCode: response?.status,
    error: response?.statusText || 'Error',
    message: reason || message || 'Unknown error',
    attributes: {
      error: cause,
      causes: cause?.caused_by ? getCauses(cause) : undefined,
    },
  };
};

/** Error thrown for failed Elasticsearch requests, with a body in the shape of Kibana route errors. */
export class EsRequestError extends Error {
  public readonly status?: number;
  public readonly body: EsUiError;

  constructor(error: unknown) {
    const body = isHttpFetchError(error)
      ? toEsUiError(error)
      : { error: 'Error', message: error instanceof Error ? error.message : String(error) };
    super(body.message);
    this.name = 'EsRequestError';
    this.status = isHttpFetchError(error) ? error.response?.status : undefined;
    this.body = body;
  }
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/**
 * Sends a request through the Elasticsearch proxy. Failures, including loading the client, reject
 * as `EsRequestError`; aborted requests reject with their `AbortError`.
 */
export const esRequest = async <T>(call: EsCall<T>): Promise<T> => {
  try {
    const client = await esClientService.esClient.getClient();
    return await call(client);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new EsRequestError(error);
  }
};

/**
 * Sends a request through the Elasticsearch proxy and resolves with `sendRequest`-style results.
 */
export const sendEsRequest = async <T>(
  call: EsCall<T>
): Promise<SendRequestResponse<T, EsUiError>> => {
  try {
    return { data: await esRequest(call), error: null };
  } catch (error) {
    const { body } = error instanceof EsRequestError ? error : new EsRequestError(error);
    return { data: null, error: body };
  }
};
/**
 * Runs `run` for chunks of index names so request URLs stay under Elasticsearch's HTTP line limit.
 */
export const runForIndexChunks = async (
  indexNames: string[],
  run: (indexNamesChunk: string[]) => Promise<unknown>
): Promise<void> => {
  await Promise.all(chunk(indexNames, MAX_INDICES_PER_REQUEST).map(run));
};
