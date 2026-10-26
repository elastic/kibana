/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { internalTools, ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import {
  type AgentBuilderToolEvent,
  type ExecutableTool,
  createErrorResult,
} from '@kbn/agent-builder-server';
import { toDynamicToolEvent, type ToolManager } from '@kbn/agent-builder-server/runner';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';

const schema = z.object({
  tool_id: z
    .string()
    .describe('Identifier of the dynamic tool to run, as listed in its definition'),
  params: z
    .record(z.string(), z.unknown())
    .describe("Arguments for the tool, matching the tool definition's `parameters` schema"),
});

export type ExecuteDynamicToolParams = z.infer<typeof schema>;

/**
 * The one native tool through which the model reaches every dynamic tool (see
 * `DynamicToolRegistry`). Keeping it in the bound tool list while skills and attachments add
 * tools mid-run keeps the prompt cache prefix stable.
 *
 * It is a plain executable rather than a builtin handler so the call goes through the tool
 * pipeline exactly once, for the inner tool: hooks, confirmation prompts, interrupts, telemetry
 * and the result store all see the inner tool id. The outer call carries nothing of its own.
 *
 * Inner params are validated here against the inner tool's schema before dispatch, so a bad
 * call is rejected before the inner tool's hooks or confirmation prompt run, and the model reads
 * the same message it gets from the provider for a bad native call.
 */
export const createExecuteDynamicTool = ({
  toolManager,
}: {
  toolManager: ToolManager;
}): ExecutableToolWithOrigin => ({
  id: internalTools.executeDynamicTool,
  type: ToolType.builtin,
  origin: ToolOrigin.internal,
  description: `Run a dynamic tool.

Dynamic tools are not in your tool list: their definitions appear in the conversation when a skill is loaded or an attachment is added. Call them through this tool with the definition's tool_id and arguments matching its parameters schema.`,
  tags: [],
  configuration: {},
  readonly: false,
  experimental: true,
  getSchema: () => schema,
  execute: async ({ toolParams, toolCallId, onEvent, source, abortSignal }) => {
    // The provider already validated the outer shape; this only narrows the type.
    const { tool_id: toolId, params } = schema.parse(toolParams);

    const tool = resolveTool({ toolId, toolManager });
    if (!tool) {
      return {
        results: [createErrorResult(unavailableToolMessage({ toolId, toolManager }))],
      };
    }

    const innerSchema = await tool.getSchema();
    const validation = innerSchema.safeParse(params);
    if (!validation.success) {
      return {
        results: [createErrorResult(invalidParamsMessage({ toolId, error: validation.error }))],
      };
    }

    const onDynamicEvent = onEvent
      ? (event: AgentBuilderToolEvent) => onEvent(toDynamicToolEvent(tool.id, event))
      : undefined;

    const response = await tool.execute({
      toolParams: validation.data,
      toolCallId,
      onEvent: onDynamicEvent,
      source: source ?? 'agent',
      abortSignal,
    });
    return { ...response, dynamicToolId: toolId };
  },
});

/**
 * The dynamic tool for `toolId`, or, as a fallback for a model calling a native tool by the wrong
 * path, the natively bound tool of that id. Internal tools are never reachable this way (mirrors
 * bash `exec_tool`): some have a dedicated step lifecycle keyed on the outer tool id.
 */
const resolveTool = ({
  toolId,
  toolManager,
}: {
  toolId: string;
  toolManager: ToolManager;
}): ExecutableTool | undefined => {
  const dynamicTool = toolManager.getDynamicTool(toolId);
  if (dynamicTool) {
    return dynamicTool;
  }
  const { origin } = toolManager.getToolMeta(toolId);
  if (origin === ToolOrigin.internal) {
    return undefined;
  }
  return toolManager.getExecutable(toolId);
};

const unavailableToolMessage = ({
  toolId,
  toolManager,
}: {
  toolId: string;
  toolManager: ToolManager;
}): string => {
  if (toolManager.getExecutable(toolId)) {
    // only internal tools reach this: any other native tool was dispatched as a fallback
    return `Tool '${toolId}' is an internal tool in your tool list: call it directly, not through ${internalTools.executeDynamicTool}.`;
  }
  const available = toolManager.listDynamicTools().map((tool) => tool.id);
  const hint =
    available.length > 0
      ? `Available dynamic tools: ${available.join(', ')}.`
      : 'No dynamic tools are available.';
  return `Dynamic tool '${toolId}' is not available. ${hint}`;
};

/** Same wording as the provider-side validation of native tool calls. */
const invalidParamsMessage = ({ toolId, error }: { toolId: string; error: z.ZodError }): string => {
  const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  return `Tool call arguments for ${toolId} were invalid: ${issues.join(', ')}`;
};
