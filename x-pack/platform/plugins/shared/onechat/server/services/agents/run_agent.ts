/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentMode, ConversationRound, RoundInput } from '@kbn/onechat-common';
import type { ExecutableTool, ToolProvider } from '@kbn/onechat-server';
import { AgentHandlerContext } from '@kbn/onechat-server';
import { runChatAgent } from './chat';
import { runPlannerAgent } from './planner';
import { runResearcherAgent } from './researcher';

export interface RunAgentParams {
  mode: AgentMode;
  /**
   * The next message in this conversation that the agent should respond to.
   */
  nextInput: RoundInput;
  /**
   * Previous rounds of conversation.
   */
  conversation?: ConversationRound[];
  /**
   * Optional system prompt to extend the default one.
   */
  systemPrompt?: string;
  /**
   * List of tools that will be exposed to the agent.
   * Either a list of tools or a tool provider.
   */
  tools: ToolProvider | ExecutableTool[];
  /**
   * In case of nested calls (e.g calling from a tool), allows to define the runId.
   */
  runId?: string;
}

export interface RunAgentResponse {
  round: ConversationRound;
}

export const runAgent = async (
  params: RunAgentParams,
  context: AgentHandlerContext
): Promise<RunAgentResponse> => {
  const { mode, ...modeParams } = params;
  switch (mode) {
    case AgentMode.researcher:
      return runResearcherAgent(modeParams, context);
    case AgentMode.thinkMore:
      return runPlannerAgent(modeParams, context);
    case AgentMode.normal:
      return runChatAgent(modeParams, context);
  }
};
