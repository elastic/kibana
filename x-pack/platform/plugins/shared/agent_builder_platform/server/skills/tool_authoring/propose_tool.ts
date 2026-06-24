/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, validateToolId } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { TOOL_ATTACHMENT_TYPE, type ToolAttachmentData } from '../../../common/attachments';
import { validateEsqlConfigForChat } from './validate_esql_config';

const esqlParamSchema = z.object({
  type: z
    .enum(['string', 'integer', 'float', 'boolean', 'date', 'array'])
    .describe(
      "Parameter's data type. Use 'date' for ISO timestamps or relative time strings like 'now-24h'. Use 'array' only when the ES|QL query expects a list (e.g. for IN (...) clauses)."
    ),
  description: z
    .string()
    .describe(
      'How the agent should fill this parameter at call time. Load-bearing: the agent reads this to decide what value to pass — write it like a routing hint, not user-facing copy. Mention the expected format and any reasonable defaults to suggest.'
    ),
  optional: z
    .boolean()
    .optional()
    .describe(
      'Defaults to false. Set true only when the query works correctly with the parameter unset.'
    ),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())])
    .optional()
    .describe(
      "Only allowed when 'optional: true'. Type must match 'type' (e.g. integer for 'integer', ISO string for 'date')."
    ),
});

const esqlConfigurationSchema = z.object({
  query: z
    .string()
    .describe(
      "Full ES|QL query string. Reference parameters via '?param_name' (one ? followed by the param key). Every '?name' in the query must have a matching key in 'params' and vice versa."
    ),
  params: z
    .record(z.string(), esqlParamSchema)
    .describe(
      "Map keyed by parameter name. The keys must match each '?name' binding referenced in 'query' exactly."
    ),
});

const proposeToolSchema = z.object({
  id: z
    .string()
    .describe(
      'Stable identifier. Lowercase letters, numbers, dots, hyphens, underscores; must start and end with a letter or number. Max 64 chars. Example: "logs.top_error_counts". Must not collide with any tool already in the registry.'
    ),
  type: z.literal(ToolType.esql).describe('Currently only "esql" is supported in chat authoring.'),
  description: z
    .string()
    .describe(
      'One-line summary of what the tool does and when an agent should pick it over alternatives. Surfaced in the tool catalog and read by other agents — lead with the trigger, not the mechanism. Example: "Use when the user asks for the most frequent error message types in a logs-* index over a recent time window."'
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe('Optional tags for organizing the tool in the management UI.'),
  configuration: esqlConfigurationSchema,
});

export type ProposeToolInput = z.infer<typeof proposeToolSchema>;

/**
 * Inline tool that captures a draft tool payload as a versioned `tool`
 * attachment in the conversation.
 *
 * Validation flow:
 * 1. The Zod schema above provides the structural shape.
 * 2. `validateToolId` enforces the same id rules used by the create endpoint.
 * 3. We pre-check the live registry so duplicate ids fail fast.
 * 4. `validateEsqlConfigForChat` catches ES|QL syntax errors and parameter
 *    mismatches before we commit a broken attachment.
 * 5. The attachment type's `validate` runs again inside `attachments.add`,
 *    producing a final structural gate.
 *
 * The handler returns the new attachment id and version so the assistant can
 * emit `<render_attachment id="..." />` to display the draft card inline.
 */
export const createProposeToolTool = (): BuiltinSkillBoundedTool<typeof proposeToolSchema> => ({
  id: 'propose_tool',
  type: ToolType.builtin,
  description:
    'Propose a new tool as an inline draft. Creates a versioned `tool` attachment containing the full tool payload (id, type, description, tags, configuration). Currently supports ES|QL tools only — `type` must be "esql". Before calling this, make sure the ES|QL query uses `?param_name` bindings and that every binding has a matching entry in `configuration.params` (with a description load-bearing enough for the agent to fill it correctly). After this call, render the draft inline by emitting `<render_attachment id="ATTACHMENT_ID" />`. Use `patch_tool` to refine the draft instead of calling `propose_tool` again unless the user wants to start over.',
  schema: proposeToolSchema,
  confirmation: { askUser: 'never' },
  handler: async (input, context) => {
    const { attachments, toolProvider, request } = context;

    const data: ToolAttachmentData = {
      id: input.id,
      type: input.type,
      description: input.description,
      ...(input.tags ? { tags: input.tags } : {}),
      configuration: input.configuration,
    };

    const idError = validateToolId({ toolId: data.id, builtIn: false });
    if (idError) {
      return {
        results: [createErrorResult({ message: `Invalid tool id "${data.id}": ${idError}` })],
      };
    }

    try {
      const existing = await toolProvider.list({ request });
      if (existing.some((t) => t.id === data.id)) {
        return {
          results: [
            createErrorResult({
              message: `A tool with id "${data.id}" already exists in this space. Pick a different id (e.g. add a more specific suffix) and call propose_tool again.`,
            }),
          ],
        };
      }
    } catch (error) {
      // Don't fail the propose just because the duplicate-id pre-check
      // couldn't reach the registry — the create endpoint will catch it.
    }

    const configErrors = await validateEsqlConfigForChat(data.configuration);
    if (configErrors.length > 0) {
      return {
        results: [
          createErrorResult({
            message: `Invalid ES|QL tool draft. Fix and retry:\n- ${configErrors.join('\n- ')}`,
          }),
        ],
      };
    }

    try {
      const attachment = await attachments.add(
        {
          type: TOOL_ATTACHMENT_TYPE,
          data,
          description: data.description,
        },
        'agent'
      );

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              attachment_id: attachment.id,
              version: attachment.current_version,
              tool_id: data.id,
              tool_type: data.type,
              param_count: Object.keys(data.configuration.params).length,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to capture tool draft: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;
    return [
      {
        ...result,
        data: {
          summary: `Drafted tool "${data.tool_id}" (v${data.version}) as attachment ${data.attachment_id}.`,
          attachment_id: data.attachment_id,
          version: data.version,
          tool_id: data.tool_id,
        },
      },
    ];
  },
});
