/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { resolveInput, extractSchemaArgs, buildRequestParams } from '@kbn/elastic-clients-sdk';
import { API_REGISTRIES, targetSchema } from './registries';

const executeSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      'The API identifier returned by the api_discover tool (e.g. "indices_create", "bulk", "cluster_health").'
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
    handler: async ({ target, api, params = {} }, { esClient, logger }) => {
      const registry = API_REGISTRIES[target];
      const meta = registry.manifest.find((m) => m.namespaceFile === api);
      if (meta == null) {
        return {
          results: [
            createErrorResult({
              message: `Unknown API identifier: "${api}". Use the ${platformCoreTools.apiDiscover} tool to find valid identifiers.`,
            }),
          ],
        };
      }

      let def;
      try {
        def = await registry.loadApi(meta);
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

      const schemaArgs = def.input != null ? extractSchemaArgs(resolveInput(def.input)) : [];
      const requestParams = buildRequestParams(def, params, schemaArgs);

      logger.debug(
        `api_execute: ${requestParams.method} ${requestParams.path} (target=${target}, api=${api})`
      );

      try {
        const transportParams: {
          method: string;
          path: string;
          querystring?: Record<string, unknown>;

          body?: any;

          bulkBody?: any;
        } = {
          method: requestParams.method,
          path: requestParams.path,
        };

        if (requestParams.querystring != null) {
          transportParams.querystring = requestParams.querystring;
        }
        if (requestParams.bulkBody != null) {
          transportParams.bulkBody = requestParams.bulkBody;
        } else if (requestParams.body != null) {
          transportParams.body = requestParams.body;
        }

        const response = await esClient.asCurrentUser.transport.request(transportParams);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                target,
                api,
                method: requestParams.method,
                path: requestParams.path,
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
              metadata: { target, api, method: requestParams.method, path: requestParams.path },
            }),
          ],
        };
      }
    },
    tags: [],
  };
};
