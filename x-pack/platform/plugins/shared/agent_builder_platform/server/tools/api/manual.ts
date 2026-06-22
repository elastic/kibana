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
import { resolveInput } from '@kbn/elastic-clients-sdk';
import { API_REGISTRIES, targetSchema } from './registries';

const manualSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      'The API identifier returned by the api_discover tool (e.g. "indices_create", "bulk", "cluster_health").'
    ),
});

/**
 * Attempt to convert a Zod schema to JSONSchema with graceful fallback.
 */
const zodToJsonSchema = (schema: z.ZodType): Record<string, unknown> => {
  try {
    return z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>;
  } catch {
    return { type: 'object', description: 'Schema could not be fully represented' };
  }
};

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

      let paramsYaml: string;
      if (def.input == null) {
        paramsYaml = '# This API has no parameters\n';
      } else {
        const schema = resolveInput(def.input);
        const jsonSchema = zodToJsonSchema(schema);

        if (jsonSchema.properties != null && typeof jsonSchema.properties === 'object') {
          const shape = schema.shape as Record<string, z.ZodType>;
          const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
          for (const [key, fieldSchema] of Object.entries(shape)) {
            const outerMeta = (fieldSchema as z.ZodType).meta() as
              | Record<string, unknown>
              | undefined;
            const foundIn = outerMeta?.found_in;
            if (foundIn != null && props[key] != null) {
              props[key]['x-found-in'] = foundIn;
            }
          }
        }

        try {
          paramsYaml = yaml.dump(jsonSchema, { indent: 2, lineWidth: 120 });
        } catch (err) {
          logger.warn(`api_manual: yaml.dump failed for "${api}": ${err}`);
          paramsYaml = JSON.stringify(jsonSchema, null, 2);
        }
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              target,
              api,
              method: def.method,
              path: def.path,
              description: def.description,
              params_schema_yaml: paramsYaml,
            },
          },
        ],
      };
    },
    tags: [],
  };
};
