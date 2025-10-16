/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import { isToolCallStep } from '@kbn/onechat-common';
import {
  LlmOptimizerEvaluationPrompt,
  calculateOptimizerScore,
  type OptimizerAnalysis,
} from '@kbn/evals';
import type { AgentsServiceStart } from '../../agents';
import type { ToolsServiceStart } from '../../tools';
import type { EvaluatorFunction } from '../types';

export const createOptimizerEvaluator = ({
  inferenceClient,
  logger,
  agentsService,
  toolsService,
  request,
}: {
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  agentsService: AgentsServiceStart;
  toolsService: ToolsServiceStart;
  request: KibanaRequest;
}): EvaluatorFunction => {
  return async (context) => {
    const { currentRound, conversation } = context;

    const userQuery = currentRound.input.message;
    const agentResponse = currentRound.response.message;

    const toolCallHistory = currentRound.steps.filter(isToolCallStep).map((step) => ({
      tool_call_id: step.tool_call_id,
      tool_id: step.tool_id,
      params: step.params,
      results: step.results,
    }));

    try {
      const agentRegistry = await agentsService.getRegistry({ request });
      const agent = await agentRegistry.get(conversation.agent_id);

      const systemInstructions = agent.configuration.instructions || '';

      const toolRegistry = await toolsService.getRegistry({ request });
      const toolSelection = agent.configuration.tools;
      const toolDefinitions = await toolRegistry.list({ selection: toolSelection });

      const availableTools = toolDefinitions.map((tool) => ({
        id: tool.id,
        type: tool.type,
        description: tool.description,
      }));

      const response = await inferenceClient.prompt({
        prompt: LlmOptimizerEvaluationPrompt,
        input: {
          user_query: userQuery,
          agent_response: agentResponse,
          system_instructions: systemInstructions,
          available_tools: JSON.stringify(availableTools, null, 2),
          tool_call_history: JSON.stringify(toolCallHistory, null, 2),
        },
      });

      const toolCall = response.toolCalls?.[0];
      if (!toolCall) {
        throw new Error('No tool call found in LLM response for optimizer evaluation');
      }

      const analysis: OptimizerAnalysis = toolCall.function.arguments;

      const score = calculateOptimizerScore(analysis);

      return {
        score,
        analysis: analysis as Record<string, any>,
      };
    } catch (error) {
      logger.error(
        `Error in optimizer evaluation: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  };
};
