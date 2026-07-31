/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { stringify as stringifyYaml } from 'yaml';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getRegistries,
  getUnsupportedReason,
  isUnknownApiError,
  targetSchema,
  toDescribedSchema,
} from './shared';
import type { ApiRegistryDefinition, ApiTarget } from './shared';

export interface ApiDescribeResultData {
  target: ApiTarget;
  api: string;
  method: ApiRegistryDefinition['method'];
  path: string;
  description: string;
  destructive: boolean;
  params_schema_yaml: string;
  unsupported_reason?: string;
}

const describeSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      `The API identifier returned by the ${platformCoreTools.discover} tool, formed from the namespace ` +
        'and name (e.g. "indices.create", "bulk", "cluster.health").'
    ),
});

export const apiDescribeTool = (): BuiltinToolDefinition<typeof describeSchema> => {
  return {
    id: platformCoreTools.describe,
    type: ToolType.builtin,
    description: `Get the full parameter specification for an HTTP API operation.

Returns:
- The HTTP \`method\` and \`path\` template (e.g. \`PUT /{index}/_create/{id}\`). Every name it
  interpolates is one of the parameters below, and must be supplied for the call to run.
- \`destructive\`: whether the operation modifies or deletes existing data. Prefer a non-destructive
  alternative when one exists.
- \`unsupported_reason\`: present only when the operation cannot be executed at all — look for
  another operation that does the same job.
- A YAML document describing every accepted parameter with its type and description. It is one flat
  set: pass them all in a single \`params\` map and the routing into the URL path, query string, and
  request body is handled for you.

Use the \`${platformCoreTools.discover}\` tool first to find the \`api\` identifier, then call
\`${platformCoreTools.execute}\` with the same \`target\` and \`api\` plus the \`params\` from this schema.`,
    schema: describeSchema,
    experimental: true,
    handler: async ({ target, api }, { logger }) => {
      let registries;
      try {
        registries = await getRegistries();
      } catch (err) {
        logger.error(`${platformCoreTools.describe}: failed to load the API registry: ${err}`);
        return {
          results: [
            createErrorResult({
              message: `Failed to load the API registry: ${
                err instanceof Error ? err.message : String(err)
              }`,
            }),
          ],
        };
      }

      const registry = registries[target];

      let loaded;
      try {
        loaded = await registry.loadApi(api);
      } catch (err) {
        if (isUnknownApiError(err)) {
          return {
            results: [
              createErrorResult({
                message: `Unknown API identifier: "${api}". Use the ${platformCoreTools.discover} tool to find valid identifiers.`,
              }),
            ],
          };
        }
        logger.error(
          `${platformCoreTools.describe}: failed to load API "${api}" (target=${target}): ${err}`
        );
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
        let paramsSchema = definition.input;
        try {
          paramsSchema = await toDescribedSchema(target, definition.input);
        } catch (err) {
          logger.warn(
            `${platformCoreTools.describe}: failed to resolve schema references for "${api}" (target=${target}): ${err}`
          );
        }

        try {
          paramsYaml = stringifyYaml(paramsSchema, { indent: 2, lineWidth: 120 });
        } catch (err) {
          logger.warn(`${platformCoreTools.describe}: yaml stringify failed for "${api}": ${err}`);
          paramsYaml = JSON.stringify(paramsSchema, null, 2);
        }
      }

      const unsupportedReason = getUnsupportedReason(definition);

      const data: ApiDescribeResultData = {
        target,
        api,
        method: definition.method,
        path: definition.path,
        description: definition.description,
        destructive: definition.destructive,
        params_schema_yaml: paramsYaml,
        ...(unsupportedReason === undefined ? {} : { unsupported_reason: unsupportedReason }),
      };

      return {
        results: [
          {
            type: ToolResultType.other,
            data,
          },
        ],
      };
    },
    tags: [],
  };
};
