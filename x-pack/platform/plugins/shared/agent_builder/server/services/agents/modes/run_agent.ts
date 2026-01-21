/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentCapabilities,
  Conversation,
  ConversationRound,
  ConverseInput,
  AgentConfiguration,
  RuntimeAgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { AgentHandlerContext } from '@kbn/agent-builder-server';
import { runDefaultAgentMode } from './default';

export interface RunAgentParams {
  /**
   * The next message in this conversation that the agent should respond to.
   */
  nextInput: ConverseInput;
  /**
   * Current conversation.
   */
  conversation?: Conversation;
  /**
   * Configuration of the agent to run
   */
  agentConfiguration: AgentConfiguration;
  /**
   * Capabilities to enable. if not specified will use the default capabilities.
   */
  capabilities?: AgentCapabilities;
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
  /**
   * Browser API tools to make available to the agent
   */
  browserApiTools?: BrowserApiToolMetadata[];
  /**
   * Whether to use structured output mode. When true, the agent will return structured data instead of plain text.
   */
  structuredOutput?: boolean;
  /**
   * Optional JSON schema for structured output. Only used when structuredOutput is true.
   * If not provided, uses a default schema.
   */
  outputSchema?: Record<string, unknown>;
  /**
   * Runtime configuration overrides applied to this run.
   * Stored on the round for auditing purposes - does not affect LLM execution.
   */
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
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
