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

function isEnotfoundError(e: unknown, depth = 0): boolean {
  if (depth > 5 || !(e instanceof Error)) {
    return false;
  }
  if ((e as NodeJS.ErrnoException).code === 'ENOTFOUND') {
    return true;
  }
  if ('cause' in e && e.cause) {
    return isEnotfoundError(e.cause, depth + 1);
  }
  return false;
}

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

      function getLocalServerUrl() {
        const serverInfo = core.http.getServerInfo();
        if (serverInfo.protocol === 'socket') {
          return undefined;
        }
        const hostname =
          serverInfo.hostname === '0.0.0.0' || serverInfo.hostname === '::'
            ? 'localhost'
            : serverInfo.hostname;
        return {
          protocol: `${serverInfo.protocol}:`,
          hostname,
          port: serverInfo.port,
          pathname: getPathnameWithSpaceId(),
          query: query ? (query as Record<string, string>) : undefined,
        };
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

      const data = body ? JSON.stringify(body) : undefined;

      const makeRequest = (url: string) =>
        axios({ method, headers, url, data, signal }).then((response) => ({
          content: response.data,
        }));

      const primaryUrl = format(nextUrl);

      try {
        return await makeRequest(primaryUrl);
      } catch (e) {
        // Fallback: when publicBaseUrl is not resolvable from Kibana's runtime
        // retry using the local server address from core.http.getServerInfo().
        // This will not work when server.ssl.clientAuthentication is set to 'required',
        // as the outbound request won't present a client certificate.
        const localUrl = isEnotfoundError(e) ? getLocalServerUrl() : undefined;

        if (!localUrl) {
          logger.error(`Error calling Kibana API: ${method} ${primaryUrl}. Failed with ${e}`);
          throw e;
        }

        const fallbackUrl = format(localUrl);
        logger.warn(
          `publicBaseUrl "${primaryUrl}" is not reachable from the Kibana server (ENOTFOUND). ` +
            `Retrying with local server address: "${method} ${fallbackUrl}"`
        );

        try {
          return await makeRequest(fallbackUrl);
        } catch (retryError) {
          logger.error(
            `Error calling Kibana API via local fallback: ${method} ${fallbackUrl}. ` +
              `Failed with ${retryError}`
          );
          throw retryError;
        }
      }
    }
  );
}
