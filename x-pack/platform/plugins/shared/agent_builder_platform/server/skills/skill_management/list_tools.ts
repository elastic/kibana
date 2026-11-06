/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { ExecutableTool } from '@kbn/agent-builder-server';

/**
 * Compact projection used both by `list_tools` and by the
 * `available_tools` field returned in `propose_skill` / `patch_skill`
 * validation errors.
 */
export interface ListedTool {
  id: string;
  description: string;
}

export const projectListedTool = (tool: ExecutableTool): ListedTool => ({
  id: tool.id,
  description: tool.description,
});

const listToolsSchema = z.object({}).describe('No parameters.');

export type ListToolsInput = z.infer<typeof listToolsSchema>;

/**
 * Inline tool that enumerates every Agent Builder tool currently available
 * to the requesting user/space.
 *
 * The `skill-management` skill mandates that the agent call this **before**
 * `propose_skill` (and again, when adding tools via `patch_skill`) so the
 * draft references only real ids.
 */
export const createListToolsTool = (): BuiltinSkillBoundedTool<typeof listToolsSchema> => ({
  id: 'list_tools',
  type: ToolType.builtin,
  description:
    "List every Agent Builder tool currently available in this space, returning each tool's id and short description. Call this BEFORE `propose_skill` (and again whenever you intend to change `tool_ids` via `patch_skill`) so the draft references only ids that actually exist in the registry. Pick ids verbatim from the result — never invent them.",
  schema: listToolsSchema,
  confirmation: { askUser: 'never' },
  handler: async (_input, context) => {
    const { toolProvider, request } = context;

    try {
      const tools = await toolProvider.list({ request });
      const projected = tools.map(projectListedTool);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              tools: projected,
              total: projected.length,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to list tools: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as { total?: number };
    const total = data.total ?? 0;
    return [
      {
        ...result,
        data: {
          summary: `Listed ${total} available tools.`,
          total,
        },
      },
    ];
  },
});
