/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredToolIdentifier } from '../tools/tools';
import type { SerializedAgentIdentifier } from '../agents';
import type { UserIdAndName } from '../base/users';

/**
 * Represents a user input that initiated a conversation round.
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
  /**
   * The text message from the assistant.
   */
  message: string;
}

/**
 * Represents a tool call with the corresponding result.
 */
export interface ToolCallWithResult {
  /**
   * Id of the tool call, as returned by the LLM
   */
  toolCallId: string;
  /**
   * Structured identifier of the tool.
   */
  toolId: StructuredToolIdentifier;
  /**
   * Arguments the tool was called with.
   */
  args: Record<string, any>;
  /**
   * Result of the tool, serialized as string.
   */
  result: string;
}

export enum ConversationRoundStepType {
  toolCall = 'toolCall',
}

export type ConversationRoundStepMixin<TType extends ConversationRoundStepType, TData> = TData & {
  type: TType;
};

export type ToolCallStep = ConversationRoundStepMixin<
  ConversationRoundStepType.toolCall,
  ToolCallWithResult
>;

export const isToolCallStep = (step: ConversationRoundStep): step is ToolCallStep => {
  return step.type === ConversationRoundStepType.toolCall;
};

// may have more type of steps later.
export type ConversationRoundStep = ToolCallStep;

/**
 * Represents a round in a conversation, containing all the information
 * related to this particular round.
 */
export interface ConversationRound {
  /** The user input that initiated the round */
  userInput: RoundInput;
  /** List of intermediate steps before the end result, such as tool calls */
  steps: ConversationRoundStep[];
  /** The final response from the assistant */
  assistantResponse: AssistantResponse;
}

export interface Conversation {
  id: string;
  agentId: SerializedAgentIdentifier;
  user: UserIdAndName;
  title: string;
  createdAt: string;
  updatedAt: string;
  rounds: ConversationRound[];
}
