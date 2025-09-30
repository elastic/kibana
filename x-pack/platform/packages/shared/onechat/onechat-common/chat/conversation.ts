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

export const createReasoningStep = (reasoningStepWithResult: ReasoningStepData): ReasoningStep => {
  return {
    type: ConversationRoundStepType.reasoning,
    ...reasoningStepWithResult,
  };
};

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
 * A content reference
 */
export type ContentReference =
  | KnowledgeBaseEntryContentReference
  | ProductDocumentationContentReference
  | EsqlContentReference
  | HrefContentReference;

/**
 * A union of all content reference types
 */
export type ContentReferences = Record<string, ContentReference>;

/**
 * A content reference block in the format {reference(id)}
 */
export type ContentReferenceBlock = `{reference(${string})}`;

/**
 * Content reference store interface
 */
export interface ContentReferencesStore {
  /**
   * Adds a content reference into the ContentReferencesStore.
   * @param generator A function that returns a new ContentReference.
   * @param generator.params Generator parameters that may be used to generate a new ContentReference.
   * @param generator.params.id An ID that is guaranteed to not exist in the store. Intended to be used as the Id of the ContentReference but not required.
   * @returns the new ContentReference
   */
  add: <T extends ContentReference>(
    generator: (params: { id: string }) => T
  ) => T | undefined;

  /**
   * Used to read the content reference store.
   * @returns a record that contains all of the ContentReference that have been added .
   */
  getStore: () => ContentReferences;

  /**
   * Options used to configure the ContentReferencesStore.
   */
  options?: {
    disabled?: boolean;
  };
}

/**
 * Creates a new content references store
 */
export const newContentReferencesStore = (options?: ContentReferencesStore['options']): ContentReferencesStore => {
  const store: Record<string, ContentReference> = {};
  let currentId = 1;

  const add: ContentReferencesStore['add'] = (creator) => {
    if (options?.disabled) {
      return undefined;
    }
    const id = `ref_${currentId++}`;
    const contentReference = creator({ id });
    store[id] = contentReference;
    return contentReference;
  };

  const getStore: ContentReferencesStore['getStore'] = () => {
    return store;
  };

  return {
    add,
    getStore,
    options,
  };
};

/**
 * Prunes content references from content and returns the pruned store
 */
export const pruneContentReferences = (
  content: string,
  contentReferencesStore: ContentReferencesStore
): { prunedContentReferencesStore: ContentReferences } => {
  const store = contentReferencesStore.getStore();
  const prunedStore: Record<string, ContentReference> = {};
  
  // Extract all content reference IDs from the content
  const referenceIds = new Set<string>();
  const regex = /\{reference\(([^)]+)\)\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    referenceIds.add(match[1]);
  }
  
  // Only include references that are actually used in the content
  for (const [id, reference] of Object.entries(store)) {
    if (referenceIds.has(id)) {
      prunedStore[id] = reference;
    }
  }
  
  return {
    prunedContentReferencesStore: prunedStore,
  };
};

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
  /** Additional metadata for the round, including content references */
  metadata?: {
    contentReferences?: ContentReferences;
  };
}

export interface Conversation {
  id: string;
  agent_id: string;
  user: UserIdAndName;
  title: string;
  created_at: string;
  updated_at: string;
  rounds: ConversationRound[];
}

export type ConversationWithoutRounds = Omit<Conversation, 'rounds'>;
