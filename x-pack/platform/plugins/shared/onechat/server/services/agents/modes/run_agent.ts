/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, RoundInput, ToolSelection } from '@kbn/onechat-common';
import type { AgentHandlerContext } from '@kbn/onechat-server';
import { runDefaultAgentMode } from './default';

export interface RunAgentParams {
  /**
   * The next message in this conversation that the agent should respond to.
   */
  nextInput: RoundInput;
  /**
   * Previous rounds of conversation.
   */
  conversation?: ConversationRound[];
  /**
   * Optional custom instructions to add to the prompts.
   */
  customInstructions?: string;
  /**
   * Selection of tools which will be exposed to the agent.
   * Defaults to exposing all available tools.
   */
  toolSelection?: ToolSelection;
  /**
   * In case of nested calls (e.g calling from a tool), allows to define the runId.
   */
  runId?: string;
  /**
   * The agent this run is for. Used for tracing.
   */
  agentId?: string;
  /**
   * optional signal to abort the execution of the agent
   */
  abortSignal?: AbortSignal;
}

export interface RunAgentResponse {
  round: ConversationRound;
}

export const runAgent = async (
  params: RunAgentParams,
  context: AgentHandlerContext
): Promise<RunAgentResponse> => {
  return runDefaultAgentMode(params, context);
};
