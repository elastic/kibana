/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import type { ToolResult } from '../tools/tool_result';
import type {
  Attachment,
  AttachmentInput,
  VersionedAttachment,
  AttachmentVersionRef,
} from '../attachments';
import type { PromptRequest, PromptResponse, PromptStorageState } from '../agents/prompts';
import type { RuntimeAgentConfigurationOverrides } from '../agents/definition';
import type { RoundState } from './round_state';

/**
 * Represents the input that initiated a conversation round.
 */
export interface RoundInput {
  /**
   * A text message from the user.
   */
  message: string;
  /**
   * Optional attachments to provide to the agent.
   * @deprecated Use attachment_refs with conversation-level attachments instead
   */
  attachments?: Attachment[];
  /**
   * References to versioned conversation-level attachments.
   */
  attachment_refs?: AttachmentVersionRef[];
}

/**
 * Represents the input used to interact with an agent (new round, resume round)
 */
export interface ConverseInput {
  /**
   * A text message from the user.
   */
  message?: string;
  /**
   * Optional attachments to provide to the agent.
   * @deprecated Use attachment_refs with conversation-level attachments instead
   */
  attachments?: AttachmentInput[];
  /**
   * References to versioned conversation-level attachments.
   */
  attachment_refs?: AttachmentVersionRef[];
  /**
   * Response from the user to prompt requests.
   */
  prompts?: Record<string, PromptResponse>;
}

/**
 * Represents the final answer from the agent in a conversation round.
 */
export interface AssistantResponse {
  /**
   * The text message from the assistant.
   */
  message: string;
  structured_output?: object;
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

export enum ConversationRoundStatus {
  /** round is currently being processed */
  inProgress = 'in_progress',
  /** the round is completed */
  completed = 'completed',
  /** round has been interrupted and is awaiting user input */
  awaitingPrompt = 'awaiting_prompt',
}

/**
 * Represents a round in a conversation, containing all the information
 * related to this particular round.
 */
export interface ConversationRound {
  /** unique id for this round */
  id: string;
  /** current status of the round */
  status: ConversationRoundStatus;
  /** persisted state to resume interrupted states */
  state?: RoundState;
  /** if status is awaiting_prompt, contains the current prompt request*/
  pending_prompt?: PromptRequest;
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
  trace_id?: string | string[];
  /** Runtime configuration overrides that were applied to this round */
  configuration_overrides?: RuntimeAgentConfigurationOverrides;
}

export interface RoundModelUsageStats {
  /**
   * Id of the connector used for this round
   */
  connector_id: string;
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
  /**
   * Model identifier from the provider response, if available.
   */
  model?: string;
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
  /**
   * Conversation-level versioned attachments.
   * These attachments are shared across all rounds and can be referenced via attachment_refs.
   */
  attachments?: VersionedAttachment[];
  /**
   * Internal representation of the prompt storage state for the conversation.
   * Keeps track of which prompts have been answered and the response.
   */
  state?: ConversationInternalState;
}

/**
 * Internal storage for the conversation's arbitrary state.
 * Used for example to keep track of the prompt responses.
 */
export interface ConversationInternalState {
  prompt?: PromptStorageState;
  /**
   * Dynamic tool IDs that were added during conversation rounds.
   * These tools are persisted across rounds so they remain available.
   */
  dynamic_tool_ids?: string[];
}

export type ConversationWithoutRounds = Omit<Conversation, 'rounds'>;
