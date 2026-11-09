/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext } from '@kbn/connector-specs';
import type { DeclarativeRequest, DeclarativeResponseMapping, DeclarativeRetry } from './types';
import { renderTemplateValue, renderUrlTemplate, type TemplateContext } from './render_template';

export interface ExecuteDeclarativeRequestOptions {
  client: ActionContext['client'];
  request: DeclarativeRequest;
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
  sleep?: (ms: number) => Promise<void>;
}

interface ClientResponse {
  status: number;
  headers: Record<string, unknown> & { get?: (name: string) => unknown };
  data: unknown;
}

interface RequestConfig {
  method: string;
  url: string;
  params?: unknown;
  headers?: Record<string, string>;
  data?: unknown;
}

interface HttpError extends Error {
  response?: {
    status: number;
    headers: Record<string, unknown>;
    data: unknown;
  };
}

const DEFAULT_INITIAL_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 5000;

const defaultSleep = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const toHeaderRecord = (value: unknown): Record<string, string> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Declarative request headers must be an object.');
  }
  return Object.fromEntries(
    Object.entries(value).map(([name, headerValue]) => {
      if (
        typeof headerValue !== 'string' &&
        typeof headerValue !== 'number' &&
        typeof headerValue !== 'boolean'
      ) {
        throw new Error(`Declarative request header "${name}" must resolve to a scalar value.`);
      }
      return [name, String(headerValue)];
    })
  );
};

const assertHttpUrl = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(
      `Declarative request URL is not valid: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Declarative requests do not support the "${url.protocol}" protocol.`);
  }
  return url.toString();
};

const buildUrl = (request: DeclarativeRequest, context: TemplateContext): string => {
  if (request.url !== undefined) {
    const configPrefix = request.url.match(/^\{\{\s*config\.baseUrl\s*\}\}(.*)$/);
    if (configPrefix) {
      const baseUrl = context.config.baseUrl;
      if (typeof baseUrl !== 'string') {
        throw new Error('Declarative request config.baseUrl must resolve to a string.');
      }
      const suffix = configPrefix[1];
      if (
        suffix !== '' &&
        !suffix.startsWith('/') &&
        !suffix.startsWith('?') &&
        !suffix.startsWith('#')
      ) {
        throw new Error(
          'Declarative request config.baseUrl must be followed by a URL path separator.'
        );
      }
      return assertHttpUrl(`${baseUrl.replace(/\/+$/, '')}${renderUrlTemplate(suffix, context)}`);
    }
    const authority = request.url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]*/)?.[0];
    if (authority?.includes('{{') || (request.url.startsWith('{{') && request.url.includes('}}'))) {
      throw new Error('Declarative request URL templates cannot control the URL origin.');
    }
    const renderedUrl = renderUrlTemplate(request.url, context);
    if (typeof renderedUrl !== 'string' || renderedUrl.length === 0) {
      throw new Error('Declarative request url must render to a string.');
    }
    return assertHttpUrl(renderedUrl);
  }

  if (request.baseUrl?.includes('{{') && request.baseUrl.trim() !== '{{ config.baseUrl }}') {
    throw new Error(
      'Declarative request baseUrl templates must use the exact config.baseUrl value.'
    );
  }
  const renderedBaseUrl = renderTemplateValue(request.baseUrl, context);
  const renderedPath =
    request.path === undefined ? undefined : renderUrlTemplate(request.path, context);
  if (typeof renderedBaseUrl !== 'string' || typeof renderedPath !== 'string') {
    throw new Error('Declarative requests require a rendered URL or base URL and path.');
  }
  return assertHttpUrl(
    `${renderedBaseUrl.replace(/\/+$/, '')}/${renderedPath.replace(/^\/+/, '')}`
  );
};

const plainHeaders = (headers: ClientResponse['headers'] | undefined): Record<string, unknown> => {
  if (!headers || typeof headers !== 'object') {
    return {};
  }
  const toJson = (headers as { toJSON?: () => unknown }).toJSON;
  if (typeof toJson === 'function') {
    const json = toJson.call(headers);
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      return json as Record<string, unknown>;
    }
  }
  return { ...headers };
};

const getHeader = (
  headers: ClientResponse['headers'] | undefined,
  name: string
): string | undefined => {
  if (!headers) {
    return undefined;
  }
  const getter = headers.get;
  const direct = typeof getter === 'function' ? getter.call(headers, name) : undefined;
  const value =
    direct ??
    Object.entries(plainHeaders(headers)).find(
      ([key]) => key.toLowerCase() === name.toLowerCase()
    )?.[1];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
};

const toHttpError = (response: ClientResponse): HttpError => {
  const error = new Error(`Request failed with status code ${response.status}`) as HttpError;
  error.response = {
    status: response.status,
    headers: plainHeaders(response.headers),
    data: response.data,
  };
  return error;
};

const readStatus = (error: unknown): number | undefined => {
  const status = (error as HttpError | undefined)?.response?.status;
  return typeof status === 'number' ? status : undefined;
};

const getRetryDelay = (error: unknown, attempt: number, retry: DeclarativeRetry): number => {
  const maxDelayMs = retry.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const initialDelayMs = retry.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const retryAfter = getHeader((error as HttpError).response?.headers, 'retry-after');
  if (retryAfter !== undefined) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, maxDelayMs);
    }
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) {
      return Math.min(Math.max(date - Date.now(), 0), maxDelayMs);
    }
  }
  return Math.min(initialDelayMs * 2 ** Math.max(attempt - 1, 0), maxDelayMs);
};

const requestWithRetry = async (
  client: ActionContext['client'],
  config: RequestConfig,
  retry: DeclarativeRetry | undefined,
  sleep: (ms: number) => Promise<void>
): Promise<ClientResponse> => {
  const maxAttempts = retry?.maxAttempts ?? 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = (await client.request(config)) as ClientResponse;
      if (response.status >= 400) {
        throw toHttpError(response);
      }
      return response;
    } catch (error) {
      lastError = error;
      const status = readStatus(error);
      const shouldRetry =
        retry !== undefined &&
        attempt < maxAttempts &&
        status !== undefined &&
        retry.statusCodes.includes(status);
      if (!shouldRetry) {
        throw error;
      }
      await sleep(getRetryDelay(error, attempt, retry));
    }
  }
  throw lastError;
};

const getPath = (value: unknown, path: string): { found: boolean; value: unknown } => {
  let current = value;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object' || !(segment in (current as object))) {
      return { found: false, value: undefined };
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return { found: true, value: current };
};

const applyResponseMapping = (
  data: unknown,
  mapping: DeclarativeResponseMapping | undefined
): unknown => {
  if (!mapping?.dataPath) {
    return mapping?.outputKey ? { [mapping.outputKey]: data } : data;
  }
  const selected = getPath(data, mapping.dataPath);
  if (!selected.found) {
    throw new Error(`Response path "${mapping.dataPath}" not found`);
  }
  return mapping.outputKey ? { [mapping.outputKey]: selected.value } : selected.value;
};

const toFormBody = (value: unknown): URLSearchParams => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Declarative form request bodies must be objects.');
  }
  const form = new URLSearchParams();
  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue === undefined || fieldValue === null) {
      continue;
    }
    form.set(key, Array.isArray(fieldValue) ? fieldValue.join(',') : String(fieldValue));
  }
  return form;
};

const toRequestBody = (body: unknown, bodyType: DeclarativeRequest['bodyType']): unknown => {
  if (bodyType === 'form') {
    return toFormBody(body);
  }
  if (bodyType === 'text') {
    return String(body);
  }
  return body;
};

const withContentType = (
  headers: Record<string, string>,
  bodyType: DeclarativeRequest['bodyType'],
  hasBody: boolean
): Record<string, string> => {
  if (!hasBody || Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')) {
    return headers;
  }
  if (bodyType === 'form') {
    return { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' };
  }
  if (bodyType === 'text') {
    return { ...headers, 'Content-Type': 'text/plain' };
  }
  return { ...headers, 'Content-Type': 'application/json' };
};

const toResult = (data: unknown): Record<string, unknown> => {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { data };
};

/** Runs a declarative HTTP request, including retry and response mapping. */
export const executeDeclarativeRequest = async ({
  client,
  request,
  input,
  config,
  sleep = defaultSleep,
}: ExecuteDeclarativeRequestOptions): Promise<Record<string, unknown>> => {
  const context: TemplateContext = { input, config: config ?? {} };
  const firstUrl = buildUrl(request, context);
  const renderedHeaders = toHeaderRecord(renderTemplateValue(request.headers ?? {}, context));
  const renderedQuery = renderTemplateValue(request.query ?? {}, context);
  const renderedBody =
    request.body === undefined ? undefined : renderTemplateValue(request.body, context);
  const data =
    renderedBody === undefined ? undefined : toRequestBody(renderedBody, request.bodyType);
  const headers = withContentType(renderedHeaders, request.bodyType, data !== undefined);
  const firstConfig: RequestConfig = {
    method: request.method,
    url: firstUrl,
    params: renderedQuery,
    headers,
    ...(data !== undefined ? { data } : {}),
  };

  const response = await requestWithRetry(client, firstConfig, request.retry, sleep);
  return toResult(applyResponseMapping(response.data, request.response));
};
