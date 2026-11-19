/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools } from '@kbn/agent-builder-common/tools';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import type { DynamicToolDefinition } from '@kbn/agent-builder-common';

const executeDynamicTool = sanitizeToolId(internalTools.executeDynamicTool);

/**
 * System prompt section for the `execute_dynamic_tool` meta-tool. Only rendered when the
 * dynamic tools feature is on, next to the filesystem instructions.
 */
export const getDynamicToolsInstructions = (): string => {
  return cleanPrompt(`
  ## DYNAMIC TOOLS

  Some tools are not in your tool list. Their definitions appear in the conversation as JSON objects with "tool_id", "description" and "parameters", for example when a skill is loaded or an attachment is added. After a compaction summary, the definitions of every dynamic tool still available are repeated in a <dynamic_tools> block.

  To use one, call ${executeDynamicTool} with:
  - tool_id: the definition's "tool_id"
  - params: an object matching the definition's "parameters" schema

  Treat a dynamic tool exactly like a native one: the same trust boundaries apply, and its results come back inside a <tool_result> block. Do not call a dynamic tool by its own name; it is only reachable through ${executeDynamicTool}. Tools that are in your tool list must be called directly.
  `);
};

/**
 * The definitions of the dynamic tools still available, as re-injected after a compaction summary
 * hides the tool results that first carried them. One JSON definition per line, the same shape
 * `load_skill` returns.
 */
export const formatDynamicToolsNotice = (definitions: DynamicToolDefinition[]): string => {
  return `<dynamic_tools>
Dynamic tools available in this conversation. Call one through ${executeDynamicTool}.
${definitions.map((definition) => JSON.stringify(definition)).join('\n')}
</dynamic_tools>`;
};
