/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { AlertEventSchema, BaseEventSchema, builtInTriggerDefinitions } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { workflowTools } from '../../common/constants';

const LARGE_ENUM_THRESHOLD = 20;

function zodToJsonSchemaSafe(schema: z.ZodType): unknown {
  try {
    const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7', unrepresentable: 'any' });
    return compactLargeEnums(jsonSchema as Record<string, unknown>);
  } catch {
    return undefined;
  }
}

/**
 * Recursively walk a JSON Schema and replace enum arrays larger than
 * {@link LARGE_ENUM_THRESHOLD} with a compact description + a few examples.
 * This avoids sending 600+ timezone names (or similar) to the LLM.
 */
function compactLargeEnums(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(compactLargeEnums);

  const obj = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'enum' && Array.isArray(value) && value.length > LARGE_ENUM_THRESHOLD) {
      const examples = value.slice(0, 5) as string[];
      result.type = 'string';
      result.description = [
        obj.description ?? '',
        `One of ${value.length} allowed values, e.g.: ${examples.join(', ')}`,
      ]
        .filter(Boolean)
        .join('. ');
    } else {
      result[key] = compactLargeEnums(value);
    }
  }

  return result;
}

/**
 * Returns the JSON Schema for `{{ event.* }}` variables available at runtime for a given trigger type.
 * Alert triggers get the full alert event context (alerts array, rule, params);
 * other built-in triggers only get `BaseEventSchema` (spaceId).
 */
function getEventContextSchema(triggerTypeId: string): unknown {
  // TODO: support custom trigger event schemas
  if (triggerTypeId === 'alert') {
    return zodToJsonSchemaSafe(AlertEventSchema);
  }
  return zodToJsonSchemaSafe(BaseEventSchema);
}

export function registerGetTriggerDefinitionsTool(agentBuilder: AgentBuilderPluginSetup): void {
  agentBuilder.tools.register({
    id: workflowTools.getTriggerDefinitions,
    type: ToolType.builtin,
    description: `Get available workflow trigger types with schemas and YAML examples.

**When to use:** To learn how to configure the \`triggers\` section of a workflow, or to understand what \`{{ event.* }}\` variables are available at runtime for a given trigger type.
**When NOT to use:** For step definitions (use get_step_definitions) or connector instances (use get_connectors).

Returns built-in trigger types (manual, scheduled, alert) including the event context schema that describes what \`{{ event.* }}\` contains at runtime.`,
    schema: z.object({
      triggerType: z
        .string()
        .optional()
        .describe('Filter by exact trigger type (e.g., "manual", "scheduled", "alert")'),
    }),
    tags: ['workflows', 'yaml', 'triggers'],
    experimental: true,
    handler: async ({ triggerType }) => {
      let definitions = builtInTriggerDefinitions.map((def) => ({
        id: def.id,
        label: def.label,
        description: def.description,
        jsonSchema: zodToJsonSchemaSafe(def.schema),
        eventContextSchema: getEventContextSchema(def.id),
        eventContextNote:
          'The event context is available via {{ event.* }} in Liquid templates. ' +
          'NEVER use {{ triggers.event }} or {{ trigger.event }} — the correct variable is {{ event }}.',
        examples: def.documentation.examples,
      }));

      if (triggerType) {
        definitions = definitions.filter((def) => def.id === triggerType);
      }

      if (definitions.length === 0 && triggerType) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                error: `Trigger type "${triggerType}" not found`,
                availableTypes: builtInTriggerDefinitions.map((d) => d.id),
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              count: definitions.length,
              triggerTypes: definitions,
            },
          },
        ],
      };
    },
  });
}
