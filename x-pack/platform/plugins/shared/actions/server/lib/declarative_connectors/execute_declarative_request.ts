/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext } from '@kbn/connector-specs';
import type { DeclarativeRequest } from './types';
import { renderTemplateValue, renderUrlTemplate, type TemplateContext } from './render_template';

export interface ExecuteDeclarativeRequestOptions {
  client: ActionContext['client'];
  request: DeclarativeRequest;
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
}

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
    const renderedUrl = renderUrlTemplate(request.url, context, true);
    if (typeof renderedUrl !== 'string' || renderedUrl.length === 0) {
      throw new Error('Declarative request url must render to a string.');
    }
    return assertHttpUrl(renderedUrl);
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

/** Runs one declarative HTTP request and returns the response body. */
export const executeDeclarativeRequest = async ({
  client,
  request,
  input,
  config,
}: ExecuteDeclarativeRequestOptions): Promise<Record<string, unknown>> => {
  const context: TemplateContext = { input, config: config ?? {} };
  const url = buildUrl(request, context);
  const renderedHeaders = toHeaderRecord(renderTemplateValue(request.headers ?? {}, context));
  const query = renderTemplateValue(request.query ?? {}, context);
  const renderedBody =
    request.body === undefined ? undefined : renderTemplateValue(request.body, context);
  const data =
    renderedBody === undefined ? undefined : toRequestBody(renderedBody, request.bodyType);
  const headers = withContentType(renderedHeaders, request.bodyType, data !== undefined);

  const response = await client.request({
    method: request.method,
    url,
    params: query,
    headers,
    ...(data !== undefined ? { data } : {}),
  });

  return toResult(response.data);
};
