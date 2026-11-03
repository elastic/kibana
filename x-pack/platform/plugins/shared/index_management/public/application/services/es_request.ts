/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { chunk } from 'lodash';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { EsProxyClient } from '@kbn/es-proxy-plugin/public';
import { MAX_INDICES_PER_REQUEST } from '../../../common/constants';
import type {
  Error as EsUiError,
  SendRequestResponse,
  UseRequestResponse,
} from '../../shared_imports';
import { esProxyService } from './es_proxy';

export type EsCall<T> = (client: EsProxyClient) => Promise<T>;

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

/** Error thrown for Elasticsearch requests that failed with a response. */
export class EsRequestError extends Error {
  public readonly status?: number;
  public readonly body: EsUiError;

  constructor(error: IHttpFetchError) {
    const body = toEsUiError(error);
    super(body.message);
    this.name = 'EsRequestError';
    this.status = error.response?.status;
    this.body = body;
  }
}

/**
 * Sends a request through the Elasticsearch proxy. Errors with a response reject as `EsRequestError`.
 */
export const esRequest = async <T>(call: EsCall<T>): Promise<T> => {
  const client = await esProxyService.esProxy.getClient();
  try {
    return await call(client);
  } catch (error) {
    if (isHttpFetchError(error) && error.response) {
      throw new EsRequestError(error);
    }
    throw error;
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
    const body: EsUiError =
      error instanceof EsRequestError
        ? error.body
        : { error: 'Error', message: error instanceof Error ? error.message : String(error) };
    return { data: null, error: body };
  }
};

/**
 * `useRequest`-style hook for requests through the Elasticsearch proxy. The request is sent again
 * whenever `requestKey` changes.
 */
export const useEsRequest = <T>(
  requestKey: string,
  call: EsCall<T>
): UseRequestResponse<T, EsUiError> => {
  const callRef = useRef(call);
  callRef.current = call;
  const requestIdRef = useRef(0);
  const [isInitialRequest, setIsInitialRequest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<T | null>();
  const [error, setError] = useState<EsUiError | null>(null);

  const resendRequest = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const response = await sendEsRequest(callRef.current);
    if (requestId !== requestIdRef.current) {
      return;
    }
    setError(response.error);
    if (!response.error) {
      setData(response.data);
    }
    setIsLoading(false);
    setIsInitialRequest(false);
  }, []);

  useEffect(() => {
    const requestIds = requestIdRef;
    resendRequest();
    return () => {
      requestIds.current++;
    };
  }, [requestKey, resendRequest]);

  return { isInitialRequest, isLoading, data, error, resendRequest };
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
