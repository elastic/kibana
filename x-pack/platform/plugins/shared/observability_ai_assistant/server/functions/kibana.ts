/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSelfFetchQuery, KibanaRequest } from '@kbn/core/server';
import type { FunctionRegistrationParameters } from '.';
import { KIBANA_FUNCTION_NAME } from '..';

const SAFE_ERROR_CODE = /^(?:UND_ERR_[A-Z0-9_]+|E[A-Z0-9_]+|ABORT_ERR)$/;
const SAFE_ERROR_TYPES = new Set(['AbortError', 'Error', 'HttpSelfFetchError', 'TypeError']);

interface ErrorDiagnostics {
  readonly type: string;
  readonly code?: string;
  readonly statusCode?: number;
}

const getErrorDiagnostics = (error: unknown): ErrorDiagnostics => {
  if (!(error instanceof Error)) {
    return { type: 'UnknownError' };
  }

  const errorWithDetails = error as Error & {
    code?: unknown;
    response?: { status?: unknown };
    body?: { statusCode?: unknown };
  };
  const rawCode = errorWithDetails.code;
  const code = typeof rawCode === 'string' && SAFE_ERROR_CODE.test(rawCode) ? rawCode : undefined;
  const rawStatusCode = errorWithDetails.response?.status ?? errorWithDetails.body?.statusCode;
  const statusCode =
    typeof rawStatusCode === 'number' && rawStatusCode >= 100 && rawStatusCode <= 599
      ? rawStatusCode
      : undefined;
  const type = SAFE_ERROR_TYPES.has(error.name) ? error.name : 'UnknownError';

  return { type, code, statusCode };
};

export function registerKibanaFunction({
  functions,
  resources,
}: FunctionRegistrationParameters & {
  resources: { request: KibanaRequest };
}) {
  functions.registerFunction(
    {
      name: KIBANA_FUNCTION_NAME,
      description:
        'Call Kibana APIs on behalf of the user. Only call this function when the user has explicitly requested it, and you know how to call it, for example by querying the knowledge base or having the user explain it to you. Assume that pathnames, bodies and query parameters may have changed since your knowledge cut off date.',
      descriptionForUser: 'Call Kibana APIs on behalf of the user',
      parameters: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            description: 'The HTTP method of the Kibana endpoint',
            enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
          },
          pathname: {
            type: 'string',
            description: 'The pathname of the Kibana endpoint, excluding query parameters',
          },
          query: {
            type: 'object',
            description: 'The query parameters, as an object',
          },
          body: {
            type: 'object',
            description: 'The body of the request',
          },
        },
        required: ['method', 'pathname'] as const,
      },
    },
    async ({ arguments: { method, pathname, body, query } }, signal) => {
      const { request, logger } = resources;
      const core = await resources.plugins.core.start();
      const fetchOptions = {
        method,
        query: query as HttpSelfFetchQuery | undefined,
        body,
        signal,
        forwardRequestHeaders: true,
        asResponse: true,
      } as const;

      try {
        const response = await core.http.selfClient.asScoped(request).fetch(pathname, fetchOptions);
        return { content: response.body };
      } catch (error) {
        const diagnostics = getErrorDiagnostics(error);
        logger.error('Kibana self HTTP API call failed', {
          labels: {
            self_http_source_route_template: request.route.path,
            self_http_target_method: method,
            self_http_error_type: diagnostics.type,
            ...(diagnostics.code ? { self_http_error_code: diagnostics.code } : {}),
          },
          ...(diagnostics.statusCode
            ? { http: { response: { status_code: diagnostics.statusCode } } }
            : {}),
        });

        throw error;
      }
    }
  );
}
