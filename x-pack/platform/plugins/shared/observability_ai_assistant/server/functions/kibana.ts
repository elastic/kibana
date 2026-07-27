/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSelfFetchQuery, KibanaRequest } from '@kbn/core/server';
import type { FunctionRegistrationParameters } from '.';
import { KIBANA_FUNCTION_NAME } from '..';

const getAccess = (pathname: string): 'public' | 'internal' => {
  return pathname === '/internal' || pathname.startsWith('/internal/') ? 'internal' : 'public';
};

const getErrorTargetUrl = (error: unknown): string | undefined => {
  if (error instanceof Error && 'request' in error) {
    return (error as Error & { request?: Request }).request?.url;
  }
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
        access: getAccess(pathname),
        asResponse: true,
      } as const;

      try {
        const response = await core.http.selfClient.asScoped(request).fetch(pathname, fetchOptions);

        logger.info(
          `Called Kibana API by forwarding request from "${
            request.rewrittenUrl ?? request.url
          }" to: "${method} ${response.request.url}"`
        );

        return { content: response.body };
      } catch (error) {
        const targetUrl = getErrorTargetUrl(error) ?? pathname;
        logger.error(
          `Error calling Kibana API by forwarding request from "${
            request.rewrittenUrl ?? request.url
          }" to: "${method} ${targetUrl}". Failed with ${error}`
        );
        throw error;
      }
    }
  );
}
