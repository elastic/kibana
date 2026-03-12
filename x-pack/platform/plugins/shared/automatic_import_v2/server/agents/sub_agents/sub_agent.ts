/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolRunnableConfig } from '@langchain/core/tools';
import { tool } from '@langchain/core/tools';
import { ToolMessage } from '@langchain/core/messages';
import { Command, getCurrentTaskInput } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from '@kbn/zod/v4';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { TASK_TOOL_DESCRIPTION } from '../prompts';
import { AutomaticImportAgentState } from '../state';
import type { SubAgent } from '../types';

const MAX_INJECTED_SAMPLES = 10;
const MAX_INJECTED_SUCCESSFUL_OUTPUTS = 5;
const MAX_INJECTED_FAILURE_DETAILS = 10;

interface TaskToolParams {
  subagents: SubAgent[];
  model: InferenceChatModel;
  samples?: string[];
  recursionLimit?: number;
}

const injectPipelineState = (
  taskDescription: string,
  agentName: string,
  samples?: string[]
): string => {
  try {
    const currentState = getCurrentTaskInput<z.infer<typeof AutomaticImportAgentState>>();
    const hasPipeline =
      currentState.current_pipeline?.processors &&
      currentState.current_pipeline.processors.length > 0;

    if (agentName === 'ingest_pipeline_generator' && hasPipeline) {
      const pipelineContext = {
        current_pipeline: currentState.current_pipeline,
        validation_results: currentState.pipeline_validation_results,
      };
      return `## Current Pipeline State\n${JSON.stringify(pipelineContext, null, 2)}\n\n${taskDescription}`;
    }

    if (agentName === 'review_agent') {
      const pipelineContext: Record<string, unknown> = {
        current_pipeline: currentState.current_pipeline,
        validation_results: currentState.pipeline_validation_results,
      };

      if (samples && samples.length > 0) {
        pipelineContext.sample_logs = samples.slice(0, MAX_INJECTED_SAMPLES);
      }

      const generationResults = currentState.pipeline_generation_results;
      if (generationResults && generationResults.length > 0) {
        pipelineContext.successful_outputs = generationResults.slice(
          0,
          MAX_INJECTED_SUCCESSFUL_OUTPUTS
        );
        pipelineContext.total_successful_count = generationResults.length;
      }

      const failureDetails = currentState.pipeline_validation_results?.failure_details;
      if (failureDetails && failureDetails.length > 0) {
        pipelineContext.failure_details = failureDetails.slice(0, MAX_INJECTED_FAILURE_DETAILS);
        pipelineContext.total_failure_count = failureDetails.length;
      }

      return `## Current State\n${JSON.stringify(pipelineContext, null, 2)}\n\n${taskDescription}`;
    }
  } catch {
    // State injection is best-effort; proceed without if unavailable
  }

  return taskDescription;
};

export const createTaskTool = (params: TaskToolParams) => {
  const { subagents, model, samples, recursionLimit } = params;
  const agentsMap = new Map<string, any>();
  for (const subagent of subagents) {
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

      const taskDescription = injectPipelineState(
        input.description,
        input.subagent_name,
        samples
      );

      const modifiedState = {
        ...state,
        messages: [{ role: 'user', content: taskDescription }],
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
