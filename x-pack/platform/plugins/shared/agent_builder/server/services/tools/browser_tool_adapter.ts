/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { tool as toTool } from '@langchain/core/tools';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import type { ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';

/**
 * Core browser-tool adapter logic (unit-testable without LangChain ToolNode).
 */
export function runBrowserToolAdapter({
  browserTool,
  rawInput,
  toolCallId,
}: {
  browserTool: BrowserApiToolMetadata;
  rawInput: Record<string, unknown>;
  toolCallId: string;
}): [string, ToolHandlerReturn] {
  const params =
    rawInput && typeof rawInput === 'object'
      ? (Object.fromEntries(
          Object.entries(rawInput).filter(([key]) => key !== '_reasoning')
        ) as Record<string, unknown>)
      : {};

  if (browserTool.returns_result) {
    return [
      '',
      {
        prompt: {
          type: AgentPromptType.browser_tool_result,
          id: uuidv4(),
          tool_id: browserTool.id,
          tool_call_id: toolCallId,
          params,
        },
      },
    ];
  }

  const callId = uuidv4();
  const result = {
    results: [
      {
        type: ToolResultType.other,
        data: {
          message: `Browser tool '${browserTool.id}' will be executed on client`,
          callId,
          executeOnClient: true,
        },
      },
    ],
  };

  return [JSON.stringify(result), result];
}

/**
 * Create a browser tool adapter that registers browser tools as LLM tools
 */
export function createBrowserToolAdapter({ browserTool }: { browserTool: BrowserApiToolMetadata }) {
  return toTool(
    async (rawInput: Record<string, unknown>, config) => {
      const toolCallId =
        (config as { configurable?: { tool_call_id?: string }; toolCall?: { id?: string } })
          .configurable?.tool_call_id ??
        (config as { toolCall?: { id?: string } }).toolCall?.id ??
        uuidv4();

      return runBrowserToolAdapter({
        browserTool,
        rawInput: rawInput ?? {},
        toolCallId,
      });
    },
    {
      name: sanitizeToolId(`browser_${browserTool.id}`),
      description: browserTool.description,
      schema: browserTool.schema,
      responseFormat: 'content_and_artifact',
    }
  );
}

/**
 * Convert browser API tools to LLM-compatible tool definitions
 */
export function browserToolsToLangchain({
  browserApiTools,
}: {
  browserApiTools: BrowserApiToolMetadata[];
}) {
  const tools = browserApiTools.map((tool) => {
    return createBrowserToolAdapter({
      browserTool: tool,
    });
  });

  const idMappings = new Map<string, string>();
  browserApiTools.forEach((tool) => {
    const toolId = sanitizeToolId(`browser_${tool.id}`);
    idMappings.set(toolId, toolId);
  });

  return { tools, idMappings };
}
