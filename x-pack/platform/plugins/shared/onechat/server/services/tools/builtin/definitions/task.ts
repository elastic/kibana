/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  platformCoreTools,
  ToolType,
  oneChatDefaultAgentId,
  ToolResultType,
} from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { AgentConfiguration } from '@kbn/onechat-common';

const taskSchema = z.object({
  message: z.string().describe('The message to send to the subagent'),
  agentId: z
    .string()
    .optional()
    .describe(
      'ID of the agent to use for the subconversation. If not provided, uses the default agent.'
    ),
  systemPrompt: z
    .string()
    .optional()
    .describe(
      "Custom system prompt for the subagent. This will override the agent's default system prompt."
    ),
  structuredOutput: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to use structured output mode. When true, the subagent will return structured data instead of plain text.'
    ),
  outputSchema: z
    .record(z.unknown())
    .optional()
    .describe(
      'Optional JSON schema for structured output. Only used when structuredOutput is true. If not provided, uses a default schema with "response" (string) and optional "data" (object) fields.'
    ),
});

export const taskTool = (): BuiltinToolDefinition<typeof taskSchema> => {
  return {
    id: platformCoreTools.task,
    type: ToolType.builtin,
    description: `Starts a new conversation instance with a subagent to handle a specific task.

Use this tool when you need to delegate a task to a subagent that will work independently. The subagent can have its own conversation context and system prompt.

Parameters:
- message: The task or question to send to the subagent
- agentId (optional): The ID of the agent to use. Defaults to the default agent if not specified.
- systemPrompt (optional): A custom system prompt that will override the agent's default instructions
- structuredOutput (optional): Whether the subagent should return structured data. Defaults to false.
- outputSchema (optional): JSON schema object defining the structure of the output. Only used when structuredOutput is true. If not provided, uses a default schema.

When logHistory is false, the subconversation will execute but won't appear in the user's conversation list.
When structuredOutput is true, the subagent will return structured JSON data instead of natural language text.
If outputSchema is provided, it must be a valid JSON schema object that will be used to structure the response.`,
    schema: taskSchema,
    handler: async (
      { message, agentId, systemPrompt, structuredOutput = false, outputSchema },
      { runner, request, logger }
    ) => {
      try {
        const targetAgentId = agentId ?? oneChatDefaultAgentId;
        const agentConfigurationOverride: Partial<AgentConfiguration> = {};

        if (systemPrompt) {
          agentConfigurationOverride.answer = {
            instructions: systemPrompt,
          };
        }

        const agentResult = await runner.runAgent({
          agentId: targetAgentId,
          agentParams: {
            nextInput: {
              message,
            },
            conversation: undefined,
            capabilities: {},
            structuredOutput,
            outputSchema,
          },
        });

        const finalAnswer =
          agentResult.result.round.response.structured_output ??
          agentResult.result.round.response.message ??
          'Task completed successfully.';

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: finalAnswer,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error executing task tool: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error executing task: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
    tags: [],
  };
};
