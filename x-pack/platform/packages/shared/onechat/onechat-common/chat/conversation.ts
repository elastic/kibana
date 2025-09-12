/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import type { ToolResult } from '../tools/tool_result';

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

// reasoning step

export interface ReasoningStepData {
  /** plain text reasoning content */
  reasoning: string;
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
 * The basis of a content reference
 */
export interface BaseContentReference {
  /**
   * Id of the content reference
   */
  id: string;
  /**
   * Type of the content reference
   */
  type: string;
}

/**
 * References a knowledge base entry
 */
export interface KnowledgeBaseEntryContentReference extends BaseContentReference {
  type: 'KnowledgeBaseEntry';
  /**
   * Id of the Knowledge Base Entry
   */
  knowledgeBaseEntryId: string;
  /**
   * Name of the knowledge base entry
   */
  knowledgeBaseEntryName: string;
}

/**
 * References an ESQL query
 */
export interface EsqlContentReference extends BaseContentReference {
  type: 'EsqlQuery';
  /**
   * An ESQL query
   */
  query: string;
  /**
   * Label of the query
   */
  label: string;
  /**
   * Time range to select in the time picker.
   */
  timerange?: {
    from: string;
    to: string;
  };
}

/**
 * References an external URL
 */
export interface HrefContentReference extends BaseContentReference {
  type: 'Href';
  /**
   * Label of the query
   */
  label?: string;
  /**
   * URL to the external resource
   */
  href: string;
}

/**
 * References the product documentation
 */
export interface ProductDocumentationContentReference extends BaseContentReference {
  type: 'ProductDocumentation';
  /**
   * Title of the documentation
   */
  title: string;
  /**
   * URL to the documentation
   */
  url: string;
}

/**
 * A content reference - union of all specific content reference types
 */
export type ContentReferenceInternal =
  | KnowledgeBaseEntryContentReference
  | ProductDocumentationContentReference
  | EsqlContentReference
  | HrefContentReference;

/**
 * A content reference (alias for ContentReferenceInternal)
 */
export type ContentReference = ContentReferenceInternal;

/**
 * A collection of content references
 */
export interface ContentReferences {
  [key: string]: ContentReference;
}

export interface MessageMetadata {
  /**
   * Data referred to by the message content.
   */
  contentReferences?: ContentReferences;
}

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
  /** when tracing is enabled, contains the traceId associated with this round */
  trace_id?: string;
  /** The timestamp of the round */
  timestamp?: string;
  /**
   * Metadata
   */
  metadata?: MessageMetadata;
}

export interface Conversation {
  id: string;
  agent_id: string;
  user: UserIdAndName;
  title: string;
  created_at: string;
  updated_at: string;
  rounds: ConversationRound[];
  space_id?: string;
  connector_id?: string;
}

export type ConversationWithoutRounds = Omit<Conversation, 'rounds'>;
