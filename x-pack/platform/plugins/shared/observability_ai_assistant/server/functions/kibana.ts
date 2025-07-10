/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { format, parse } from 'url';
import { castArray, first, pick, pickBy } from 'lodash';
import type { KibanaRequest } from '@kbn/core/server';
import type { FunctionRegistrationParameters } from '.';

export function registerKibanaFunction({
  functions,
  resources,
}: FunctionRegistrationParameters & {
  resources: { request: KibanaRequest };
}) {
  functions.registerFunction(
    {
      name: 'kibana',
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
    ({ arguments: { method, pathname, body, query } }, signal) => {
      const { request } = resources;

      const { protocol, host, pathname: pathnameFromRequest } = request.rewrittenUrl || request.url;

      const origin = first(castArray(request.headers.origin));

      const nextUrl = {
        host,
        protocol,
        ...(origin ? pick(parse(origin), 'host', 'protocol') : {}),
        pathname: pathnameFromRequest.replace(
          '/internal/observability_ai_assistant/chat/complete',
          pathname
        ),
        query: query ? (query as Record<string, string>) : undefined,
      };

      const copiedHeaderNames = [
        'accept-encoding',
        'accept-language',
        'accept',
        'content-type',
        'cookie',
        'kbn-build-number',
        'kbn-version',
        'origin',
        'referer',
        'user-agent',
        'x-elastic-internal-origin',
        'x-elastic-product-origin',
        'x-kbn-context',
      ];

      const headers = pickBy(request.headers, (value, key) => {
        return (
          copiedHeaderNames.includes(key.toLowerCase()) || key.toLowerCase().startsWith('sec-')
        );
      });

      return axios({
        method,
        headers,
        url: format(nextUrl),
        data: body ? JSON.stringify(body) : undefined,
        signal,
      }).then((response) => {
        return { content: response.data };
      });
    }
  );
}
