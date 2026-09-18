/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext } from '@kbn/connector-specs';
import type { DeclarativeConnectorSpec, DeclarativeRequest } from './types';

interface TemplateContext {
  input: Record<string, unknown>;
  config: Record<string, unknown>;
}

type ClientRequestConfig = Parameters<ActionContext['client']['request']>[0];

interface ClientResponse {
  data: unknown;
  headers: Record<string, unknown> & {
    get?: (name: string) => unknown;
  };
  status: number;
}

interface ClientRequestError {
  response?: {
    headers?: ClientResponse['headers'];
    status?: number;
  };
}

interface ExecuteDeclarativeRequestOptions {
  context: ActionContext;
  connector: DeclarativeConnectorSpec;
  request: DeclarativeRequest;
  input: Record<string, unknown>;
  sleep?: (milliseconds: number) => Promise<void>;
}

const EXACT_TEMPLATE = /^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/;
const EMBEDDED_TEMPLATE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

const getPath = (value: unknown, path?: string): unknown => {
  if (!path) return value;
  let current = value;
  for (const segment of path.split('.')) {
    if (UNSAFE_PATH_SEGMENTS.has(segment)) {
      throw new Error(`Unsafe declarative template path segment "${segment}".`);
    }
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const resolveTemplatePath = (path: string, context: TemplateContext): unknown => {
  const [root, ...segments] = path.split('.');
  if (root !== 'input' && root !== 'config') {
    throw new Error(
      `Declarative templates may only read from input or config. Received "${path}".`
    );
  }
  return getPath(context[root], segments.join('.'));
};

const resolveRequiredTemplatePath = (path: string, context: TemplateContext): unknown => {
  const resolved = resolveTemplatePath(path, context);
  if (resolved === undefined || resolved === null) {
    throw new Error(`Declarative template "${path}" did not resolve to a value.`);
  }
  return resolved;
};

const renderValue = (value: unknown, context: TemplateContext): unknown => {
  if (typeof value === 'string') {
    const exactMatch = value.match(EXACT_TEMPLATE);
    if (exactMatch) return resolveTemplatePath(exactMatch[1], context);
    return value.replace(EMBEDDED_TEMPLATE, (_, path: string) =>
      String(resolveRequiredTemplatePath(path, context))
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderValue(item, context));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nested]) => [key, renderValue(nested, context)] as const)
        .filter(([, nested]) => nested !== undefined)
    );
  }
  return value;
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

const buildUrl = (request: DeclarativeRequest, templateContext: TemplateContext): string => {
  const renderedUrl = request.url ? renderValue(request.url, templateContext) : undefined;
  let url: URL;
  if (typeof renderedUrl === 'string') {
    url = new URL(renderedUrl);
  } else {
    const renderedBaseUrl = renderValue(request.baseUrl, templateContext);
    const renderedPath = renderValue(request.path, templateContext);
    if (typeof renderedBaseUrl !== 'string' || typeof renderedPath !== 'string') {
      throw new Error('Declarative requests require a rendered URL or base URL and path.');
    }
    url = new URL(`${renderedBaseUrl.replace(/\/+$/, '')}/${renderedPath.replace(/^\/+/, '')}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Declarative requests do not support the "${url.protocol}" protocol.`);
  }
  return url.toString();
};

const buildAuthHeaders = (
  connector: DeclarativeConnectorSpec,
  context: ActionContext
): Record<string, string> => {
  const selectedAuthType = context.secrets?.authType;
  const authType = connector.auth.types.find(
    (candidate) => (typeof candidate === 'string' ? candidate : candidate.type) === selectedAuthType
  );
  if (
    !authType ||
    typeof authType === 'string' ||
    authType.type !== 'api_key_header' ||
    !authType.prefix
  ) {
    return {};
  }
  const header = authType.defaults.headerField;
  if (typeof header !== 'string' || !header) {
    throw new Error(`Connector auth type "${authType.type}" requires a headerField default.`);
  }
  const rawValue = context.secrets?.[header];
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    throw new Error(`Connector secret "${header}" is required.`);
  }
  return { [header]: `${authType.prefix}${rawValue.trim()}` };
};

const toFormBody = (value: unknown): URLSearchParams => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Declarative form request bodies must be objects.');
  }
  const form = new URLSearchParams();
  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue === undefined || fieldValue === null) continue;
    form.set(key, Array.isArray(fieldValue) ? fieldValue.join(',') : String(fieldValue));
  }
  return form;
};

const buildRequestConfig = ({
  connector,
  context,
  request,
  input,
  url,
}: Omit<ExecuteDeclarativeRequestOptions, 'sleep'> & { url: string }): ClientRequestConfig => {
  const templateContext = {
    input,
    config: context.config ?? {},
  };
  const renderedHeaders = renderValue(request.headers ?? {}, templateContext);
  const renderedQuery = renderValue(request.query ?? {}, templateContext);
  const renderedBody = renderValue(request.body, templateContext);
  const headers = {
    ...toHeaderRecord(renderedHeaders),
    ...buildAuthHeaders(connector, context),
  };

  let data = renderedBody;
  if (request.bodyType === 'form') {
    data = toFormBody(renderedBody);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (request.bodyType === 'text' && renderedBody !== undefined) {
    data = String(renderedBody);
  }

  return {
    method: request.method,
    url,
    params: renderedQuery,
    headers,
    ...(renderedBody !== undefined ? { data } : {}),
  };
};

const defaultSleep = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const getResponseHeader = (
  headers: ClientResponse['headers'] | undefined,
  name: string
): string | string[] | undefined => {
  if (!headers) return undefined;
  const value =
    headers.get?.(name) ??
    Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  return undefined;
};

const getRetryDelay = (
  error: ClientRequestError,
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number
): number => {
  const retryAfter = getResponseHeader(error.response?.headers, 'retry-after');
  if (typeof retryAfter === 'string') {
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
  config: ClientRequestConfig,
  request: DeclarativeRequest,
  sleep: (milliseconds: number) => Promise<void>
): Promise<ClientResponse> => {
  const retry = request.retry;
  const maxAttempts = retry?.maxAttempts ?? 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return (await client.request(config)) as ClientResponse;
    } catch (error) {
      const requestError = error as ClientRequestError;
      const status = requestError.response?.status;
      const shouldRetry =
        attempt < maxAttempts && status !== undefined && retry?.statusCodes.includes(status);
      if (!shouldRetry) throw error;
      await sleep(
        getRetryDelay(
          requestError,
          attempt,
          retry?.initialDelayMs ?? 200,
          retry?.maxDelayMs ?? 5000
        )
      );
    }
  }
  throw new Error('Declarative request retry loop ended unexpectedly.');
};

const getNextLink = (response: ClientResponse, headerName: string): string | undefined => {
  const header = getResponseHeader(response.headers, headerName);
  const value = Array.isArray(header) ? header.join(',') : header;
  if (typeof value !== 'string') return undefined;
  for (const part of value.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (match) return match[1];
  }
  return undefined;
};

const getRateLimitMetadata = (
  response: ClientResponse,
  request: DeclarativeRequest
): Record<string, string> | undefined => {
  const configured = request.response?.rateLimitHeaders;
  if (!configured) return undefined;
  const values = Object.fromEntries(
    Object.entries(configured)
      .map(([key, headerName]) => {
        const header = headerName ? getResponseHeader(response.headers, headerName) : undefined;
        return [key, Array.isArray(header) ? header[0] : header] as const;
      })
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
  return Object.keys(values).length > 0 ? values : undefined;
};

const toResultObject = (value: unknown, outputKey?: string): Record<string, unknown> => {
  if (outputKey) return { [outputKey]: value };
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
};

export const executeDeclarativeRequest = async ({
  context,
  connector,
  request,
  input,
  sleep = defaultSleep,
}: ExecuteDeclarativeRequestOptions): Promise<Record<string, unknown>> => {
  const templateContext = { input, config: context.config ?? {} };
  const firstUrl = buildUrl(request, templateContext);
  let currentUrl = firstUrl;
  let currentConfig = buildRequestConfig({ connector, context, request, input, url: currentUrl });
  const items: unknown[] = [];
  let response: ClientResponse | undefined;
  let nextUrl: string | undefined;
  const maxPages = request.pagination?.maxPages ?? 1;
  let pages = 0;

  while (pages < maxPages) {
    response = await requestWithRetry(context.client, currentConfig, request, sleep);
    pages++;
    if (!request.pagination) break;

    const pageItems = getPath(response.data, request.pagination.itemsPath);
    if (!Array.isArray(pageItems)) {
      throw new Error('Declarative paginated responses must resolve to an array.');
    }
    items.push(...pageItems);
    nextUrl = getNextLink(response, request.pagination.header ?? 'link');
    if (!nextUrl) break;
    const parsedNextUrl = new URL(nextUrl, currentUrl);
    if (parsedNextUrl.origin !== new URL(firstUrl).origin) {
      throw new Error('Declarative pagination cannot follow a cross-origin next link.');
    }
    currentUrl = parsedNextUrl.toString();
    currentConfig = buildRequestConfig({ connector, context, request, input, url: currentUrl });
    delete currentConfig.params;
  }

  if (!response) {
    throw new Error('Declarative request did not produce a response.');
  }

  const rateLimit = getRateLimitMetadata(response, request);
  if (request.pagination) {
    return {
      [request.pagination.outputKey]: items,
      _meta: {
        pages,
        truncated: Boolean(nextUrl && pages >= maxPages),
        ...(rateLimit ? { rateLimit } : {}),
      },
    };
  }

  const dataPath = request.response?.dataPath;
  const selected = getPath(response.data, dataPath);
  if (dataPath && selected === undefined) {
    throw new Error(`Declarative response path "${dataPath}" did not resolve to a value.`);
  }
  return {
    ...toResultObject(selected, request.response?.outputKey),
    ...(rateLimit ? { _meta: { rateLimit } } : {}),
  };
};
