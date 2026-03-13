/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolRunnableConfig } from '@langchain/core/tools';
import { tool } from '@langchain/core/tools';
import { ToolMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from '@kbn/zod';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { TASK_TOOL_DESCRIPTION } from '../prompts';
import { AutomaticImportAgentState } from '../state';
import type { SubAgent } from '../types';

interface TaskToolParams {
  subagents: SubAgent[];
  model: InferenceChatModel;
  recursionLimit?: number;
}

export const createTaskTool = (params: TaskToolParams) => {
  const { subagents, model, recursionLimit } = params;
  const agentsMap = new Map<string, any>();
  for (const subagent of subagents) {
    // Create ReAct agent for the subagent
    const baseSubAgent = createReactAgent({
      llm: model,
      tools: subagent.tools || [],
      messageModifier: subagent.prompt,
      stateSchema: AutomaticImportAgentState,
    });
    const ReActSubAgent =
      recursionLimit != null ? baseSubAgent.withConfig({ recursionLimit }) : baseSubAgent;

    agentsMap.set(subagent.name, ReActSubAgent);
  }

  return tool(
    async (input: { description: string; subagent_name: string }, config: ToolRunnableConfig) => {
      const state = AutomaticImportAgentState;
      const toolCallId = config?.toolCall?.id as string;
      const subAgent = agentsMap.get(input.subagent_name);

      const modifiedState = {
        ...state,
        messages: [{ role: 'user', content: input.description }],
      };

      try {
        const result = await subAgent.invoke(modifiedState);

        return new Command({
          update: {
            ...result,
            messages: [
              new ToolMessage({
                content: result.messages?.slice(-1)[0]?.content,
                tool_call_id: toolCallId,
              }),
            ],
          },
        });
      } catch (e) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `Error executing task with ${input.subagent_name}: ${String(e)}`,
                tool_call_id: toolCallId,
              }),
            ],
          },
        });
      }
    },
    {
      name: 'task',
      description: TASK_TOOL_DESCRIPTION.replace(
        '{available_agents}',
        subagents.map((a) => `- ${a.name}: ${a.description}`).join('\n')
      ),
      schema: z.object({
        description: z.string().describe('The task to execute with the selected agent'),
        subagent_name: z
          .string()
          .describe(
            `Name of the agent to use. Available: ${subagents.map((a) => a.name).join(', ')}`
          ),
      }),
    }
  );
};
