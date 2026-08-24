/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { stringify as stringifyYaml } from 'yaml';
import { ToolType } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { InternalBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { EXPANDABLE_KEY, loadApi, targetSchema, toDescribedDefinition } from '../../api';
import type { ApiTarget, DescribedSchema } from '../../api';
import { apiFailureToErrorResult } from './errors';

export interface ApiDescribeTypeResultData {
  target: ApiTarget;
  api: string;
  type: string;
  schema_yaml: string;
  expandable_types: string[];
}

const describeTypeSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      `The identifier of the API whose schema referenced the type, as passed to the ` +
        `${internalTools.describeApi} tool (e.g. "search", "indices.create").`
    ),
  type: z
    .string()
    .describe(
      `The name of the type to expand, taken verbatim from a stub's \`${EXPANDABLE_KEY}\` or from ` +
        `the \`expandable_types\` list of the ${internalTools.describeApi} result ` +
        '(e.g. "_types.query_dsl__QueryContainer").'
    ),
});

export const createDescribeTypeTool = (): InternalBuiltinToolDefinition<
  typeof describeTypeSchema
> => {
  return {
    id: internalTools.describeType,
    type: ToolType.builtin,
    description: `Get the full specification of a shared type stubbed by \`${internalTools.describeApi}\`.

Call this whenever you need to build a value for a parameter whose schema is a stub (carries
\`${EXPANDABLE_KEY}\`). Pass the same \`target\` and \`api\` you described, plus the type name
that stub carries.

Returns a YAML document for that type alone, so it costs far less than re-describing the API. In
it, \`$ref: '#'\` points back at the type itself. The document is bounded the same way the API
schema is, so it may contain stubs of its own. Expand those with another call to this tool. The
types it stubbed are listed in \`expandable_types\`.`,
    schema: describeTypeSchema,
    handler: async ({ target, api, type }, { logger }) => {
      const loadResult = await loadApi(target, api);
      if (loadResult.status !== 'loaded') {
        return {
          results: [
            apiFailureToErrorResult(loadResult, {
              toolId: internalTools.describeType,
              target,
              api,
              logger,
            }),
          ],
        };
      }

      const { definition } = loadResult.loaded;
      if (definition.input == null) {
        return {
          results: [
            createErrorResult({
              message: `"${api}" takes no parameters, so it references no types. Do not retry it.`,
              metadata: { target, api, type },
            }),
          ],
        };
      }

      let described: DescribedSchema | undefined;
      try {
        described = await toDescribedDefinition(target, definition.input, type);
      } catch (err) {
        logger.warn(
          `${internalTools.describeType}: failed to resolve schema references for "${api}" (target=${target}): ${err}`
        );
        return {
          results: [
            createErrorResult({
              message:
                `Failed to load the type definitions for "${api}". Build the request from what ` +
                `${internalTools.describeApi} already told you.`,
              metadata: { target, api, type },
            }),
          ],
        };
      }

      if (!described) {
        return {
          results: [
            createErrorResult({
              message:
                `"${api}" references no type named "${type}". Call ${internalTools.describeApi} ` +
                `for "${api}" and use a name from its \`expandable_types\`, spelled exactly as ` +
                `it appears there.`,
              metadata: { target, api, type },
            }),
          ],
        };
      }

      let schemaYaml: string;
      try {
        schemaYaml = stringifyYaml(described.schema, { indent: 2, lineWidth: 120 });
      } catch (err) {
        logger.warn(`${internalTools.describeType}: yaml stringify failed for "${type}": ${err}`);
        schemaYaml = JSON.stringify(described.schema, null, 2);
      }

      const data: ApiDescribeTypeResultData = {
        target,
        api,
        type,
        schema_yaml: schemaYaml,
        expandable_types: described.expandableTypes,
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
