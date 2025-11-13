/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import type { ToolResult } from '../tools/tool_result';
import type { Attachment, AttachmentInput } from '../attachments';

/**
 * Represents a user input that initiated a conversation round.
 */
export interface RoundInput {
  /**
   * A text message from the user.
   */
  message: string;
  /**
   * Optional attachments to provide to the agent.
   */
  attachments?: Attachment[];
}

/**
 * Raw version of RoundInput, as accepted as input by the converse and agent APIs.
 */
export interface RawRoundInput {
  /**
   * A text message from the user.
   */
  message: string;
  /**
   * Optional attachments to provide to the agent.
   */
  attachments?: AttachmentInput[];
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

export enum ConversationRoundStepType {
  toolCall = 'tool_call',
  reasoning = 'reasoning',
}

// tool call step

export type ConversationRoundStepMixin<TType extends ConversationRoundStepType, TData> = TData & {
  type: TType;
};

/**
 * Tool call progress which were emitted during the tool execution
 */
export interface ToolCallProgress {
  /**
   * The full text message
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
  tool_call_id: string;
  /**
   * Identifier of the tool.
   */
  tool_id: string;
  /**
   * Arguments the tool was called with.
   */
  params: Record<string, any>;
  /**
   * List of progress message which were send during that tool call
   */
  progression?: ToolCallProgress[];
  /**
   * Result of the tool
   */
  results: ToolResult[];
}

export type ToolCallStep = ConversationRoundStepMixin<
  ConversationRoundStepType.toolCall,
  ToolCallWithResult
>;

export const createToolCallStep = (toolCallWithResult: ToolCallWithResult): ToolCallStep => {
  return {
    type: ConversationRoundStepType.toolCall,
    ...toolCallWithResult,
  };
};

export const isToolCallStep = (step: ConversationRoundStep): step is ToolCallStep => {
  return step.type === ConversationRoundStepType.toolCall;
};

export const createReasoningStep = (reasoningStepWithResult: ReasoningStepData): ReasoningStep => {
  return {
    type: ConversationRoundStepType.reasoning,
    ...reasoningStepWithResult,
  };
};

export interface ReasoningStepData {
  /** plain text reasoning content */
  reasoning: string;
  /** if true, will not be displayed in the thinking panel, only used as "current thinking" **/
  transient?: boolean;
}

export type ReasoningStep = ConversationRoundStepMixin<
  ConversationRoundStepType.reasoning,
  ReasoningStepData
>;

export const isReasoningStep = (step: ConversationRoundStep): step is ReasoningStep => {
  return step.type === ConversationRoundStepType.reasoning;
};

/**
 * Defines all possible types for round steps.
 */
export type ConversationRoundStep = ToolCallStep | ReasoningStep;

/**
 * Represents a round in a conversation, containing all the information
 * related to this particular round.
 */
export interface ConversationRound {
  /** unique id for this round */
  id: string;
  /** The user input that initiated the round */
  input: RoundInput;
  /** List of intermediate steps before the end result, such as tool calls */
  steps: ConversationRoundStep[];
  /** The final response from the assistant */
  response: AssistantResponse;
  /** when the round was started */
  started_at: string;
  /** time it took to first token, in ms */
  time_to_first_token: number;
  /** time it took to last token, in ms */
  time_to_last_token: number;
  /** Model Usage statistics for this round */
  model_usage: RoundModelUsageStats;
  /** when tracing is enabled, contains the traceId associated with this round */
  trace_id?: string;
}

export interface RoundModelUsageStats {
  /**
   * Number of LLM calls which were done during this round.
   */
  llm_calls: number;
  /**
   * Total number of input tokens sent this round.
   */
  input_tokens: number;
  /**
   * Total number of output tokens received this round.
   */
  output_tokens: number;
}

/**
 * Main structure representing a conversation with an agent.
 */
export interface Conversation {
  /** unique id for this conversation */
  id: string;
  /** id of the agent this conversation is bound to */
  agent_id: string;
  /** info of the owner of the discussion */
  user: UserIdAndName;
  /** title of the conversation */
  title: string;
  /** creation date */
  created_at: string;
  /** update date */
  updated_at: string;
  /** list of round for this conversation */
  rounds: ConversationRound[];
}

export type ConversationWithoutRounds = Omit<Conversation, 'rounds'>;
