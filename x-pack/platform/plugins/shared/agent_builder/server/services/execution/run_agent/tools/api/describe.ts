/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { stringify as stringifyYaml } from 'yaml';
import { ToolType } from '@kbn/agent-builder-common';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { InternalBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { EXPANDABLE_KEY, loadApi, targetSchema, toDescribedSchema } from '../../api';
import type { ApiRegistryDefinition } from '../../api';
import { apiFailureToErrorResult } from './errors';

export interface ApiDescribeResultData {
  target: ApiTarget;
  api: string;
  method: ApiRegistryDefinition['method'];
  path: string;
  description: string;
  destructive: boolean;
  params_schema_yaml: string;
  expandable_types: string[];
}

const describeSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      `The API identifier returned by the ${internalTools.discoverApis} tool, formed from the namespace ` +
        'and name (e.g. "indices.create", "bulk", "cluster.health").'
    ),
});

export const createDescribeApiTool = (): InternalBuiltinToolDefinition<typeof describeSchema> => {
  return {
    id: internalTools.describeApi,
    type: ToolType.builtin,
    description: `Get the full parameter specification for an HTTP API operation.

Returns:
- The HTTP \`method\` and \`path\` template (e.g. \`PUT /{index}/_create/{id}\`). Every name it
  interpolates is one of the parameters below, and must be supplied for the call to run.
- \`destructive\`: whether the operation modifies or deletes existing data. Prefer a non-destructive
  alternative when one exists.
- A YAML document describing every accepted parameter with its type and description. It is one flat
  set: pass them all in a single \`params\` map and the routing into the URL path, query string, and
  request body is handled for you.
- Stubs, for shared types too large to inline. A stub carries \`${EXPANDABLE_KEY}\` with the
  type's name, and lists the names of its immediate children under \`x-properties\` (object
  property names) or \`x-one-of\` (union member types). An \`x-omitted\` count means that list
  was itself truncated. A stub tells you a value of that type is accepted and what it can contain,
  but not how to spell any of it out, so call \`${internalTools.describeApiType}\` with the same
  \`target\` and \`api\` plus the names of every stubbed type you need, in one call, before
  building values for them. Never guess a stubbed type's contents.
- \`expandable_types\`: the name of every type the schema stubbed, so you can see up front what
  still has to be expanded before you can fill it in.

Use the \`${internalTools.discoverApis}\` tool first to find the \`api\` identifier, then call
\`${internalTools.executeApi}\` with the same \`target\` and \`api\` plus the \`params\` from this schema.`,
    schema: describeSchema,
    handler: async ({ target, api }, { logger }) => {
      const loadResult = await loadApi(target, api);
      if (loadResult.status !== 'loaded') {
        return {
          results: [
            apiFailureToErrorResult(loadResult, {
              toolId: internalTools.describeApi,
              target,
              api,
              logger,
            }),
          ],
        };
      }

      const { definition } = loadResult.loaded;

      let paramsYaml: string;
      let expandableTypes: string[] = [];
      if (definition.input == null) {
        paramsYaml = '# This API has no parameters\n';
      } else {
        let paramsSchema = definition.input;
        try {
          const described = await toDescribedSchema(target, definition.input);
          paramsSchema = described.schema;
          expandableTypes = described.expandableTypes;
        } catch (err) {
          logger.warn(
            `${internalTools.describeApi}: failed to resolve schema references for "${api}" (target=${target}): ${err}`
          );
        }

        try {
          paramsYaml = stringifyYaml(paramsSchema, { indent: 2, lineWidth: 120 });
        } catch (err) {
          logger.warn(`${internalTools.describeApi}: yaml stringify failed for "${api}": ${err}`);
          paramsYaml = JSON.stringify(paramsSchema, null, 2);
        }
      }

      const data: ApiDescribeResultData = {
        target,
        api,
        method: definition.method,
        path: definition.path,
        description: definition.description,
        destructive: definition.destructive,
        params_schema_yaml: paramsYaml,
        expandable_types: expandableTypes,
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
