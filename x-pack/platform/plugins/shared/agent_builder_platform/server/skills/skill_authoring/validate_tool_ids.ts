/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { projectListedTool, type ListedTool } from './list_tools';

/**
 * Result of validating a list of candidate `tool_ids` against the live tool
 * registry, scoped to the current user/space.
 */
export type ToolIdsValidationResult =
  | { ok: true }
  | { ok: false; invalidToolIds: string[]; availableTools: ListedTool[] };

/**
 * Validate `tool_ids` against the registry the requesting user can see.
 */
export const validateToolIdsAgainstRegistry = async (
  context: Pick<ToolHandlerContext, 'toolProvider' | 'request'>,
  toolIds: string[] | undefined
): Promise<ToolIdsValidationResult> => {
  if (!toolIds || toolIds.length === 0) {
    return { ok: true };
  }

  const tools = await context.toolProvider.list({ request: context.request });
  const knownIds = new Set(tools.map((t) => t.id));
  const invalidToolIds = toolIds.filter((id) => !knownIds.has(id));

  if (invalidToolIds.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    invalidToolIds,
    availableTools: tools.map(projectListedTool),
  };
};

/**
 * Format the user-facing error message for an invalid-tool-ids failure.
 * Kept separate so propose_skill and patch_skill emit identical wording.
 */
export const formatInvalidToolIdsMessage = (invalidToolIds: string[]): string =>
  `Unknown tool_ids: ${invalidToolIds.join(', ')}. Call list_tools to see the valid set, then ` +
  `update the skill via patch_skill using ids from the returned list. Do not invent tool ids.`;
