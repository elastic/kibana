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
import { createApiIdentifierSchema } from './api_identifier';
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

const createDescribeSchema = (discoveryEnabled: boolean) =>
  z.object({
    target: targetSchema,
    api: createApiIdentifierSchema(discoveryEnabled),
  });

export const createDescribeApiTool = ({
  discoveryEnabled,
}: {
  discoveryEnabled: boolean;
}): InternalBuiltinToolDefinition<ReturnType<typeof createDescribeSchema>> => {
  const usageGuidance = discoveryEnabled
    ? ''
    : `Do not call this tool unless a skill or the user explicitly names the operation to call. It
cannot search for or list operations, and there is no other tool that can. Never invent an
identifier, recall one from memory (even one you are confident exists), or adapt one from a URL,
from documentation, or after an unknown-identifier error. Asking for a result does not name an
operation. Only describe an operation you are about to call with \`${internalTools.executeApi}\`.
This tool is not a general reference for how an API works. When nothing you were given names the
operation, do not use this tool or \`${internalTools.executeApi}\` at all. Do the task with your
other tools instead, or tell the user the operation is not available.

`;
  const identifierGuidance = discoveryEnabled
    ? `Use the \`${internalTools.discoverApis}\` tool first to find the \`api\` identifier, then call`
    : `Describe the operation here to confirm it exists and to see its params, then call`;

  const summary = discoveryEnabled
    ? 'Get the full parameter specification for an HTTP API operation.'
    : 'Get the full parameter specification for an HTTP API operation that a skill or the user explicitly named.';

  return {
    id: internalTools.describeApi,
    type: ToolType.builtin,
    description: `${summary}

${usageGuidance}Returns:
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

${identifierGuidance}
\`${internalTools.executeApi}\` with the same \`target\` and \`api\` plus the \`params\` from this schema.`,
    schema: createDescribeSchema(discoveryEnabled),
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
              discoveryEnabled,
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
