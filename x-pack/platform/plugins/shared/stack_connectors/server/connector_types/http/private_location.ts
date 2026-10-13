/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STATUS_CODES } from 'http';
import type { AxiosHeaderValue, AxiosResponse } from 'axios';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ActionParamsType } from '@kbn/connector-schemas/http';
import { AuthType } from '@kbn/connector-schemas/common/auth';
import type { HttpConnectorTypeExecutorOptions, HttpConnectorTypeExecutorResult } from './types';
import type { PrivateLocationHttpResponse, PrivateLocationRunner } from '../../private_location';
import { processBufferResponse } from '../lib/process_buffer_response';
import { errorResultInvalid, errorResultRequestFailed, getErrorResponseMessage } from './errors';

// The agent stores the response body in a single Elasticsearch document, so it caps it.
const AGENT_MAX_RESPONSE_BYTES = 1024 * 1024;
const AGENT_MAX_REDIRECTS = 10;
const MS_PER_SECOND = 1000;

export interface HttpErrorResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  responseMessage?: string;
}

const toStringHeaders = (headers: Record<string, AxiosHeaderValue>): Record<string, string> =>
  Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value != null) {
      acc[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    return acc;
  }, {});

const getMaxRedirects = (fetcher: ActionParamsType['fetcher']): number => {
  if (fetcher?.follow_redirects === false) {
    return 0;
  }
  const maxRedirects = fetcher?.max_redirects ?? AGENT_MAX_REDIRECTS;
  return Math.min(Math.max(Math.floor(maxRedirects), 0), AGENT_MAX_REDIRECTS);
};

const getResponseMessage = (
  { statusCode, headers }: PrivateLocationHttpResponse,
  data: unknown
): string | undefined => {
  const response: AxiosResponse<unknown> = {
    data,
    status: statusCode,
    statusText: STATUS_CODES[statusCode] ?? '',
    headers,
    config: { headers: new AxiosHeaders() },
  };
  return getErrorResponseMessage(
    new AxiosError(undefined, undefined, undefined, undefined, response)
  );
};

/** Executes an HTTP connector request through an agent in a private location. */
export const executeViaPrivateLocation = async ({
  execOptions,
  privateLocation,
  runner,
  method,
  url,
  headers,
  body,
  onHttpError,
}: {
  execOptions: HttpConnectorTypeExecutorOptions;
  privateLocation: string;
  runner: PrivateLocationRunner | undefined;
  method: string;
  url: string;
  headers: Record<string, AxiosHeaderValue>;
  body: string | undefined;
  onHttpError: (response: HttpErrorResponse) => HttpConnectorTypeExecutorResult;
}): Promise<HttpConnectorTypeExecutorResult> => {
  const {
    actionId,
    config,
    params: { fetcher, form_data: formData },
    services,
    configurationUtilities,
    logger,
    connectorUsageCollector,
    request: kibanaRequest,
    signal,
  } = execOptions;

  if (!runner) {
    return errorResultRequestFailed(
      actionId,
      `private location "${privateLocation}" cannot be used: private locations are not available`
    );
  }
  if (formData) {
    return errorResultInvalid(actionId, 'form_data cannot be used with a private location');
  }
  if (fetcher?.skip_ssl_verification) {
    return errorResultInvalid(
      actionId,
      'fetcher.skip_ssl_verification cannot be used with a private location'
    );
  }

  try {
    configurationUtilities.ensureUriAllowed(url);
  } catch (allowListError) {
    return errorResultRequestFailed(actionId, allowListError.message);
  }

  const maxResponseBytes =
    fetcher?.max_content_length !== undefined ? Math.floor(fetcher.max_content_length) : undefined;
  const { timeout: timeoutMs } = configurationUtilities.getResponseSettings();
  connectorUsageCollector.addRequestBodyBytes(undefined, body);

  let response: PrivateLocationHttpResponse;
  try {
    response = await runner.execute({
      privateLocation,
      connectorId: actionId,
      kibanaRequest,
      signal,
      request: {
        method,
        url,
        headers: toStringHeaders(headers),
        body,
        maxRedirects: getMaxRedirects(fetcher),
        maxResponseBytes,
        timeoutSeconds: Math.ceil(timeoutMs / MS_PER_SECOND),
      },
    });
  } catch (error) {
    const message = `[private location "${privateLocation}"] ${error.message}`;
    logger.error(`error on ${actionId} http event: ${message}`);
    return errorResultRequestFailed(actionId, message);
  }

  const { statusCode: status, headers: responseHeaders, bodyTruncated } = response;
  logger.debug(
    `response from http action "${actionId}" via private location "${privateLocation}": [HTTP ${status}]`
  );

  const isOAuth2 =
    config.authType === AuthType.OAuth2ClientCredentials ||
    config.authType === AuthType.OAuth2Password;
  if (isOAuth2 && status >= 400 && status < 500) {
    await services.connectorTokenClient.deleteConnectorTokens({ connectorId: actionId });
  }

  if (bodyTruncated) {
    // Same message as axios, so callers detect response size limits the same way.
    const limit = Math.min(maxResponseBytes ?? AGENT_MAX_RESPONSE_BYTES, AGENT_MAX_RESPONSE_BYTES);
    return errorResultRequestFailed(actionId, `maxContentLength size of ${limit} exceeded`);
  }

  const statusText = STATUS_CODES[status] ?? '';
  const headersRecord = { ...responseHeaders };
  const data = processBufferResponse(Buffer.from(response.body ?? '', 'utf8'), headersRecord);

  if (status >= 200 && status < 300) {
    return { status: 'ok', actionId, data: { status, statusText, headers: headersRecord, data } };
  }

  return onHttpError({
    status,
    statusText,
    headers: headersRecord,
    responseMessage: getResponseMessage(response, data),
  });
};
