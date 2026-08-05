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
import type { ToolHandlerReturn } from '@kbn/agent-builder-server';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';

/**
 * Create a browser tool adapter that registers browser tools as LLM tools
 */
export function createBrowserToolAdapter({ browserTool }: { browserTool: BrowserApiToolMetadata }) {
  return toTool(
    async (params: Record<string, unknown>) => {
      // Two-way tools interrupt the execution: the browser runs the handler and resumes
      // the round with its result, which is then handed to the model as the tool result.
      // See `pendingBrowserToolPromptsToActions`.
      if (browserTool.returns_result) {
        const interrupt: ToolHandlerReturn = {
          prompt: {
            type: AgentPromptType.browser_tool_call,
            id: uuidv4(),
            tool_id: browserTool.id,
            params,
            // Persisted on the prompt so the resume path knows how to process the response
            // (browser tool metadata is no longer available at that point).
            result_type: browserTool.result_type,
          },
        };

        return [`Waiting for the browser to run '${browserTool.id}'`, interrupt];
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
