/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import yaml from 'js-yaml';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { API_REGISTRIES, findApi, targetSchema } from './registries';

const manualSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      'The API identifier returned by the api_discover tool, formed from the namespace and name ' +
        '(e.g. "indices.create", "bulk", "cluster.health").'
    ),
});

export const apiManualTool = (): BuiltinToolDefinition<typeof manualSchema> => {
  return {
    id: platformCoreTools.apiManual,
    type: ToolType.builtin,
    description: `Get the full parameter specification for an HTTP API operation.

Returns:
- The HTTP \`method\` and \`path\` template (e.g. \`PUT /{index}/_create/{id}\`)
- A YAML document describing all accepted parameters with their types, descriptions, and \`x-found-in\` annotation
  - \`x-found-in: path\` — interpolated into the URL path
  - \`x-found-in: query\` — sent as a URL query parameter
  - \`x-found-in: body\` — included in the request body

Use the \`${platformCoreTools.apiDiscover}\` tool first to find the \`api\` identifier.
Then call \`${platformCoreTools.apiExecute}\` with the same \`target\`, \`api\`, and \`params\` from this schema.`,
    schema: manualSchema,
    handler: async ({ target, api }, { logger }) => {
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
        logger.error(`api_manual: failed to load API "${api}" (target=${target}): ${err}`);
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

      const { definition } = loaded;

      let paramsYaml: string;
      if (definition.input == null) {
        paramsYaml = '# This API has no parameters\n';
      } else {
        try {
          paramsYaml = yaml.dump(definition.input, { indent: 2, lineWidth: 120 });
        } catch (err) {
          logger.warn(`api_manual: yaml.dump failed for "${api}": ${err}`);
          paramsYaml = JSON.stringify(definition.input, null, 2);
        }
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              target,
              api,
              method: definition.method,
              path: definition.path,
              description: definition.description,
              params_schema_yaml: paramsYaml,
            },
          },
        ],
      };
    },
    tags: [],
  };
};
