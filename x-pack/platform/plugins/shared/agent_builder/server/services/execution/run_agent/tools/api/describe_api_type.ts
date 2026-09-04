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
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { ToolHandlerResult } from '@kbn/agent-builder-server/tools';
import { EXPANDABLE_KEY, loadApi, targetSchema, toDescribedDefinition } from '../../api';
import type { DescribedSchema } from '../../api';
import { apiFailureToErrorResult } from './errors';

export interface ApiDescribeTypeResultData {
  target: ApiTarget;
  api: string;
  type: string;
  schema_yaml: string;
  expandable_types: string[];
}

const describeApiTypeSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      `The identifier of the API whose schema referenced the types, as passed to the ` +
        `${internalTools.describeApi} tool (e.g. "search", "indices.create").`
    ),
  types: z
    .array(z.string())
    .min(1)
    .max(20)
    .describe(
      `The names of the types to expand, each taken verbatim from a stub's \`${EXPANDABLE_KEY}\` ` +
        `or from the \`expandable_types\` list of the ${internalTools.describeApi} result ` +
        '(e.g. ["_types.query_dsl__QueryContainer", "_types.aggregations__AggregationContainer"]). ' +
        'Pass every type you still need in one call rather than calling this tool repeatedly.'
    ),
});

export const createDescribeApiTypeTool = (): InternalBuiltinToolDefinition<
  typeof describeApiTypeSchema
> => {
  return {
    id: internalTools.describeApiType,
    type: ToolType.builtin,
    description: `Get the full specification of the shared types stubbed by \`${internalTools.describeApi}\`.

Call this whenever you need to build a value for a parameter whose schema is a stub (carries
\`${EXPANDABLE_KEY}\`). Pass the same \`target\` and \`api\` you described, plus the type names
those stubs carry. \`types\` takes a list, so ask for every type you still need at once instead of
calling this tool once per type.

Returns one YAML document per requested type, so it costs far less than re-describing the API. In
each, \`$ref: '#'\` points back at the type it describes. The documents are bounded the same way the
API schema is, so they may contain stubs of their own. Expand those with another call to this tool.
The types each one stubbed are listed in its \`expandable_types\`.`,
    schema: describeApiTypeSchema,
    handler: async ({ target, api, types }, { logger }) => {
      const loadResult = await loadApi(target, api);
      if (loadResult.status !== 'loaded') {
        return {
          results: [
            apiFailureToErrorResult(loadResult, {
              toolId: internalTools.describeApiType,
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
              metadata: { target, api, types },
            }),
          ],
        };
      }

      const requested = Array.from(new Set(types));
      const { input } = definition;

      let described: Array<DescribedSchema | undefined>;
      try {
        described = await Promise.all(
          requested.map((type) => toDescribedDefinition(target, input, type))
        );
      } catch (err) {
        logger.warn(
          `${internalTools.describeApiType}: failed to resolve schema references for "${api}" (target=${target}): ${err}`
        );
        return {
          results: [
            createErrorResult({
              message:
                `Failed to load the type definitions for "${api}". Build the request from what ` +
                `${internalTools.describeApi} already told you.`,
              metadata: { target, api, types: requested },
            }),
          ],
        };
      }

      const results: ToolHandlerResult[] = [];
      const missing: string[] = [];

      requested.forEach((type, index) => {
        const definitionForType = described[index];
        if (!definitionForType) {
          missing.push(type);
          return;
        }

        let schemaYaml: string;
        try {
          schemaYaml = stringifyYaml(definitionForType.schema, { indent: 2, lineWidth: 120 });
        } catch (err) {
          logger.warn(
            `${internalTools.describeApiType}: yaml stringify failed for "${type}": ${err}`
          );
          schemaYaml = JSON.stringify(definitionForType.schema, null, 2);
        }

        const data: ApiDescribeTypeResultData = {
          target,
          api,
          type,
          schema_yaml: schemaYaml,
          expandable_types: definitionForType.expandableTypes,
        };

        results.push(createOtherResult(data));
      });

      if (missing.length > 0) {
        const names = missing.map((type) => `"${type}"`).join(', ');
        results.push(
          createErrorResult({
            message:
              `"${api}" references no ${missing.length === 1 ? 'type' : 'types'} named ${names}. ` +
              `Call ${internalTools.describeApi} for "${api}" and use names from its ` +
              `\`expandable_types\`, spelled exactly as they appear there.`,
            metadata: { target, api, types: missing },
          })
        );
      }

      return { results };
    },
    tags: [],
  };
};
