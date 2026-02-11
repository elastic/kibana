/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { format } from 'url';
import { pickBy } from 'lodash';
import type { KibanaRequest } from '@kbn/core/server';
import { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import type { FunctionRegistrationParameters } from '.';
import { KIBANA_FUNCTION_NAME } from '..';

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
      const requestUrl = request.rewrittenUrl || request.url;
      const core = await resources.plugins.core.start();

      function getParsedPublicBaseUrl() {
        const { publicBaseUrl } = core.http.basePath;
        if (!publicBaseUrl) {
          const errorMessage = `Cannot invoke Kibana tool: "server.publicBaseUrl" must be configured in kibana.yml`;
          logger.error(errorMessage);
          throw new Error(errorMessage);
        }
        const parsedBaseUrl = new URL(publicBaseUrl);
        return parsedBaseUrl;
      }

      function getPathnameWithSpaceId() {
        const { serverBasePath } = core.http.basePath;
        const { spaceId } = getSpaceIdFromPath(requestUrl.pathname, serverBasePath);
        const pathnameWithSpaceId = addSpaceIdToPath(serverBasePath, spaceId, pathname);
        return pathnameWithSpaceId;
      }

      const parsedPublicBaseUrl = getParsedPublicBaseUrl();
      const nextUrl = {
        host: parsedPublicBaseUrl.host,
        protocol: parsedPublicBaseUrl.protocol,
        pathname: getPathnameWithSpaceId(),
        query: query ? (query as Record<string, string>) : undefined,
      };

      logger.info(
        `Calling Kibana API by forwarding request from "${requestUrl}" to: "${method} ${format(
          nextUrl
        )}"`
      );

      const copiedHeaderNames = [
        'accept-encoding',
        'accept-language',
        'accept',
        'authorization',
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

      try {
        const response = await axios({
          method,
          headers,
          url: format(nextUrl),
          data: body ? JSON.stringify(body) : undefined,
          signal,
        });
        return { content: response.data };
      } catch (e) {
        logger.error(`Error calling Kibana API: ${method} ${format(nextUrl)}. Failed with ${e}`);
        throw e;
      }
    }
  );
}
