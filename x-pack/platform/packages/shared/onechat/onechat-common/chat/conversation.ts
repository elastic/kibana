/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredToolIdentifier } from '../tools/tools';
import type { UserIdAndName } from '../base/users';

/**
 * Represents a user input that initiated a conversation round
 */
export interface RoundInput {
  /**
   * A text message from the user.
   */
  message: string;
}

/**
 * Represents the final answer from the agent in a conversation round.
 */
export interface AssistantResponse {
  message: string;
}

/**
 * Represents a tool call with the corresponding result.
 */
export interface ToolCallWithResult {
  toolCallId: string;
  toolId: StructuredToolIdentifier;
  args: Record<string, any>;
  result: string;
}

/**
 * Represents a round in a conversation, containing all the information
 * related to this particular round.
 */
export interface ConversationRound {
  /** The user input that initiated the round */
  userInput: RoundInput;
  /** List of tool calls with results */
  toolCalls: ToolCallWithResult[];
  /** The final response from the assistant */
  assistantResponse: AssistantResponse;
  // TODO: artifacts
  // TODO: additional stuff we might need?
}

export interface Conversation {
  id: string;
  agentId: string;
  user: UserIdAndName;
  title: string;
  createdAt: string;
  updatedAt: string;
  rounds: ConversationRound[];
}
