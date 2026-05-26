/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ToolCallback, ToolDefinition, ToolSchema } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolsStart } from '@kbn/agent-builder-server';

/**
 * Loads MCP tools registered in agent builder and bridges them into the
 * `additionalTools` / `additionalToolCallbacks` shape consumed by the
 * sig-events discovery reasoning agent.
 *
 * Each MCP tool is listed via `agentBuilder.tools.getRegistry`, its Zod
 * input schema is converted to JSON Schema for the inference API, and
 * execution is delegated back to `agentBuilder.tools.execute`.
 */
export interface McpDiscoveryTools {
  tools: Record<string, ToolDefinition>;
  callbacks: Record<string, ToolCallback>;
  promptSnippet: string;
}

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

export const createMcpDiscoveryTools = async ({
  toolsStart,
  request,
  logger,
}: {
  toolsStart: ToolsStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<McpDiscoveryTools | undefined> => {
  let registry;
  try {
    registry = await toolsStart.getRegistry({ request });
  } catch (err) {
    logger.warn(`Failed to load agent builder tool registry: ${getErrorMessage(err)}`);
    return undefined;
  }

  let mcpToolDefs;
  try {
    mcpToolDefs = await registry.list({ types: [ToolType.mcp] });
  } catch (err) {
    logger.warn(`Failed to list MCP tools: ${getErrorMessage(err)}`);
    return undefined;
  }

  if (mcpToolDefs.length === 0) {
    return undefined;
  }

  const tools: Record<string, ToolDefinition> = {};
  const callbacks: Record<string, ToolCallback> = {};

  for (const mcpTool of mcpToolDefs) {
    let zodSchema: ReturnType<typeof z.object>;
    try {
      zodSchema = await mcpTool.getSchema();
    } catch (err) {
      logger.debug(
        `Skipping MCP tool "${mcpTool.id}" — schema unavailable: ${getErrorMessage(err)}`
      );
      continue;
    }

    const jsonSchema = z.toJSONSchema(zodSchema) as ToolSchema;

    const toolName = `mcp_${mcpTool.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    const description =
      typeof mcpTool.getLlmDescription === 'function'
        ? await mcpTool.getLlmDescription({
            config: mcpTool.configuration,
            description: mcpTool.description ?? '',
          })
        : mcpTool.description ?? `MCP tool: ${mcpTool.id}`;

    tools[toolName] = {
      description,
      schema: jsonSchema,
    };

    callbacks[toolName] = async (toolCall) => {
      const toolParams = (toolCall.function.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await toolsStart.execute({
          toolId: mcpTool.id,
          toolParams,
          request,
        });

        const firstResult = result.results?.[0];
        if (!firstResult) {
          return { response: { result: null } };
        }

        return { response: { result: firstResult.data } };
      } catch (err) {
        logger.warn(`MCP tool "${mcpTool.id}" execution failed: ${getErrorMessage(err)}`);
        return { response: { error: getErrorMessage(err) } };
      }
    };
  }

  if (Object.keys(tools).length === 0) {
    return undefined;
  }

  const toolNames = Object.keys(tools)
    .map((n) => `- **${n}**`)
    .join('\n');

  const promptSnippet = `
You have access to external tools provided by MCP (Model Context Protocol) servers configured in Agent Builder. Use these tools to query external systems, fetch live data, or look up domain-specific information that may be relevant to the stream you are analysing:
${toolNames}

Use these tools when the stream's data suggests a relevant external source. Prefer analysing the stream's own data first; use MCP tools to enrich or cross-reference your findings.`;

  return { tools, callbacks, promptSnippet };
};
