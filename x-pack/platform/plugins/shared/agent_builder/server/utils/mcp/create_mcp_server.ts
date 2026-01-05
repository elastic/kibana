/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodTypeAny } from '@kbn/zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import { createToolIdMappings } from '@kbn/agent-builder-genai-utils/langchain';
import type { InternalToolDefinition } from '@kbn/agent-builder-server/tools';
import type { ConfirmPromptDefinition } from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { PromptManagerInitialState, Runner } from '@kbn/agent-builder-server/runner';
import { KibanaMcpHttpTransport } from './kibana_mcp_http_transport';
import type { ToolRegistry } from '../../services/tools';

const MCP_SERVER_NAME = 'elastic-mcp-server';
const MCP_SERVER_VERSION = '0.0.1';

export const createMcpServer = async ({
  logger,
  request,
  toolRegistry,
  runner,
  serverName = MCP_SERVER_NAME,
  serverVersion = MCP_SERVER_VERSION,
}: {
  logger: Logger;
  request: KibanaRequest;
  toolRegistry: ToolRegistry;
  runner: Runner;
  serverName?: string;
  serverVersion?: string;
}) => {
  const transport = new KibanaMcpHttpTransport({ sessionIdGenerator: undefined, logger });

  const server = new McpServer(
    {
      name: serverName,
      version: serverVersion,
    },
    { capabilities: { tools: {}, elicitation: { form: {} } } }
  );

  const tools = await toolRegistry.list({});
  const idMapping = createToolIdMappings(tools);

  for (const tool of tools) {
    await addTool({ server, tool, runner, request, idMapping });
  }

  return { server, transport };
};

const addTool = async ({
  server,
  request,
  runner,
  idMapping,
  tool,
}: {
  server: McpServer;
  request: KibanaRequest;
  tool: InternalToolDefinition;
  runner: Runner;
  idMapping: ToolIdMapping;
}) => {
  const toolId = idMapping.get(tool.id) ?? tool.id;
  const toolSchema = await tool.getSchema();
  const toolHandler = createHandler({ server, tool, runner, request });

  server.registerTool(
    toolId,
    { description: tool.description, inputSchema: toolSchema.shape },
    toolHandler
  );
};

const createHandler = ({
  tool,
  server,
  request,
  runner,
}: {
  tool: InternalToolDefinition;
  runner: Runner;
  request: KibanaRequest;
  server: McpServer;
}) => {
  const handler: ToolCallback<ZodTypeAny> = async (args) => {
    const promptState: PromptManagerInitialState = {
      promptMap: {},
    };

    const callTool = () => {
      return runner.runTool({
        toolId: tool.id,
        toolParams: args,
        promptState,
        request,
      });
    };

    let toolResult = await callTool();

    // Handle prompts in a loop - tool can return multiple prompts sequentially
    while (toolResult.prompt) {
      const confirmed = await elicitConfirmation({ confirmation: toolResult.prompt, server });

      // Update promptState with the user's confirmation response
      promptState.promptMap[toolResult.prompt.id] = {
        type: AgentPromptType.confirmation,
        confirmed,
      };

      // User confirmed, call the tool again - it may return another prompt or the final result
      toolResult = await callTool();
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(toolResult) }],
    };
  };

  return handler;
};

const elicitConfirmation = async ({
  confirmation,
  server,
}: {
  confirmation: ConfirmPromptDefinition;
  server: McpServer;
}) => {
  let message = confirmation.message ?? `Confirm action ${confirmation.id}`;
  if (confirmation.title) {
    message = `${confirmation.title}\n\n${message}`;
  }

  const response = await server.server.elicitInput({
    mode: 'form',
    message,
    requestedSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean' },
      },
      required: ['confirm'],
    },
  });

  const accepted = response.action === 'accept' && response.content?.confirm === true;

  return accepted;
};
