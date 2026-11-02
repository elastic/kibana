/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext } from '@kbn/connector-specs';
import type { DeclarativeRequest } from './types';
import { renderTemplateValue, type TemplateContext } from './render_template';

export interface ExecuteDeclarativeRequestOptions {
  client: ActionContext['client'];
  request: DeclarativeRequest;
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
  sleep?: (ms: number) => Promise<void>;
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

const buildUrl = (request: DeclarativeRequest, context: TemplateContext): string => {
  if (request.url !== undefined) {
    const renderedUrl = renderTemplateValue(request.url, context);
    if (typeof renderedUrl !== 'string' || renderedUrl.length === 0) {
      throw new Error('Declarative request url must render to a string.');
    }
    return renderedUrl;
  }

  const renderedBaseUrl = renderTemplateValue(request.baseUrl, context);
  const renderedPath = renderTemplateValue(request.path, context);
  if (typeof renderedBaseUrl !== 'string' || typeof renderedPath !== 'string') {
    throw new Error('Declarative requests require a rendered URL or base URL and path.');
  }
  return `${renderedBaseUrl.replace(/\/+$/, '')}/${renderedPath.replace(/^\/+/, '')}`;
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
  const headers = toHeaderRecord(renderTemplateValue(request.headers ?? {}, context));
  const query = renderTemplateValue(request.query ?? {}, context);
  const body = request.body === undefined ? undefined : renderTemplateValue(request.body, context);

  const response = await client.request({
    method: request.method,
    url,
    params: query,
    headers,
    ...(body !== undefined ? { data: body } : {}),
  });

  return toResult(response.data);
};
