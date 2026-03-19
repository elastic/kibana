/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from '@kbn/zod';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup } from '@kbn/core/server';
import type { PluginStartDependencies } from '../types';

export const ALERTING_GET_RULE_TYPE_PARAMS_SCHEMA_TOOL_ID = 'alerting.get_rule_type_params_schema';

const getRuleTypeParamsSchemaSchema = z.object({
  rule_type_id: z.string().describe('The rule type ID obtained from list_rule_types'),
});

export function createGetRuleTypeParamsSchemaTool(
  core: CoreSetup<PluginStartDependencies>
): StaticToolRegistration<typeof getRuleTypeParamsSchemaSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getRuleTypeParamsSchemaSchema> = {
    id: ALERTING_GET_RULE_TYPE_PARAMS_SCHEMA_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Get the parameter schema for a specific alerting rule type. Use this after list_rule_types to understand what fields are required when creating a rule. The returned schema describes each parameter with its type, description, and whether it is required.',
    schema: getRuleTypeParamsSchemaSchema,
    tags: ['alerting', 'rules'],
    handler: async ({ rule_type_id }, _context) => {
      const [, { alerting }] = await core.getStartServices();

      let ruleType;
      try {
        ruleType = alerting.getType(rule_type_id);
      } catch {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Rule type '${rule_type_id}' not found` },
            },
          ],
        };
      }

      const paramsSchema = ruleType.schemas?.params;

      if (!paramsSchema) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                rule_type_id,
                message:
                  'No structured schema available for this rule type. Ask the user to provide the params as a JSON object directly.',
              },
            },
          ],
        };
      }

      if (paramsSchema.type === 'config-schema') {
        const description = paramsSchema.schema.getSchema().describe();
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { rule_type_id, schema_type: 'config-schema', schema: description },
            },
          ],
        };
      }

      if (paramsSchema.type === 'zod') {
        const jsonSchema = zodToJsonSchema(paramsSchema.schema as unknown as ZodType, {
          $refStrategy: 'none',
        });
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { rule_type_id, schema_type: 'zod', schema: jsonSchema },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { rule_type_id, message: 'Unknown schema type' },
          },
        ],
      };
    },
  };

  return toolDefinition;
}
