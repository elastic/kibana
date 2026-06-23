/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core-http-server';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { TransportRequestParams } from '@elastic/transport';
import type { ApiRequest } from '@kbn/elastic-clients-sdk';
import { API_REGISTRIES, findApi, targetSchema } from './registries';

/**
 * Issues a Kibana HTTP API call on behalf of the current user.
 *
 * TODO: wire up the actual invocation. The scoped `request` from the tool handler
 * context is passed through so the future implementation can perform the call with
 * the current user's credentials and space. Until then this stub throws so callers
 * surface a clear "not implemented" error rather than silently succeeding.
 */
const invokeKibanaApi = async (_request: KibanaRequest, _params: ApiRequest): Promise<unknown> => {
  throw new Error('api_execute: Kibana HTTP API invocation is not yet implemented');
};

const executeSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      'The API identifier returned by the api_discover tool, formed from the namespace and name ' +
        '(e.g. "indices.create", "bulk", "cluster.health").'
    ),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Flat map of parameter values. Keys must match the field names from the api_manual schema. ' +
        'Path, query, and body parameters are all provided here; routing is handled automatically ' +
        'based on the found_in metadata in the API schema.'
    ),
});

export const apiExecuteTool = (): BuiltinToolDefinition<typeof executeSchema> => {
  return {
    id: platformCoreTools.apiExecute,
    type: ToolType.builtin,
    description: `Execute an HTTP API call on behalf of the current user.

- Use \`${platformCoreTools.apiDiscover}\` to find the \`api\` identifier.
- Use \`${platformCoreTools.apiManual}\` to understand what \`params\` are accepted.
- Supply all parameter values (path, query, and body) in the flat \`params\` map.
  The tool automatically routes each parameter to the correct location based on the API schema.

The response is the raw API response body.`,
    schema: executeSchema,
    handler: async ({ target, api, params = {} }, { esClient, request, logger }) => {
      const registry = API_REGISTRIES[target];
      const meta = findApi(registry, api);
      if (meta == null) {
        return {
          results: [
            createErrorResult({
              message: `Unknown API identifier: "${api}". Use the ${platformCoreTools.apiDiscover} tool to find valid identifiers.`,
            }),
          ],
        };
      }

      let loaded;
      try {
        loaded = await registry.loadApi(meta);
      } catch (err) {
        logger.error(`api_execute: failed to load API "${api}" (target=${target}): ${err}`);
        return {
          results: [
            createErrorResult({
              message: `Failed to load API definition for "${api}": ${
                err instanceof Error ? err.message : String(err)
              }`,
            }),
          ],
        };
      }

      const apiRequest = loaded.buildRequest(params);

      logger.debug(
        `api_execute: ${apiRequest.method} ${apiRequest.path} (target=${target}, api=${api})`
      );

      try {
        let response: unknown;

        if (target === 'kibana') {
          response = await invokeKibanaApi(request, apiRequest);
        } else {
          const transportParams: TransportRequestParams = {
            method: apiRequest.method,
            path: apiRequest.path,
          };

          if (apiRequest.querystring != null) {
            transportParams.querystring = apiRequest.querystring;
          }
          if (apiRequest.bulkBody != null) {
            transportParams.bulkBody = apiRequest.bulkBody;
          } else if (apiRequest.body !== undefined) {
            transportParams.body = apiRequest.body;
          }

          response = await esClient.asCurrentUser.transport.request(transportParams);
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                target,
                api,
                method: apiRequest.method,
                path: apiRequest.path,
                response,
              },
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`api_execute: request failed for "${api}" (target=${target}): ${message}`);
        return {
          results: [
            createErrorResult({
              message: `API request failed: ${message}`,
              metadata: { target, api, method: apiRequest.method, path: apiRequest.path },
            }),
          ],
        };
      }
    },
    tags: [],
  };
};
