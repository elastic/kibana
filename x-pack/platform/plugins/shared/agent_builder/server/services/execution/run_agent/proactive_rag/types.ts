/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';

/**
 * Context extracted from the conversation for memory search.
 */
export interface ExtractedContext {
  /** Key topics discussed in the conversation */
  topics: string[];
  /** Named entities mentioned (services, hosts, etc.) */
  entities: string[];
  /** Recent questions from the user */
  recentQuestions: string[];
  /** Inferred user intent */
  userIntent: string;
  /** Hash for change detection (to avoid redundant searches) */
  hash: string;
}

/**
 * A finding from the memory search.
 */
export interface MemoryFinding {
  /** Page ID */
  pageId: string;
  /** Page name */
  pageName: string;
  /** Page title */
  pageTitle: string;
  /** Relevant excerpt from the page content */
  relevantExcerpt: string;
  /** Why this finding is relevant to the conversation */
  relevanceReason: string;
  /** Relevance score from search */
  score: number;
}

/**
 * Ready-to-inject proactive context.
 */
export interface ProactiveContext {
  /** Unique ID for this context injection */
  id: string;
  /** The search query that was used */
  searchQuery: string;
  /** Findings from memory */
  findings: MemoryFinding[];
  /** When this context was generated */
  generatedAt: string;
}

/**
 * Configuration for the proactive RAG service.
 */
export interface ProactiveRagConfig {
  /** Debounce interval in milliseconds */
  debounceMs: number;
  /** Maximum number of findings to include */
  maxFindings: number;
  /** Minimum score threshold for findings */
  minScore: number;
  /** Delay before tool execution to give proactive RAG time to search (ms) */
  toolCallDelayMs: number;
}

/**
 * Callback when proactive context is ready.
 */
export type OnContextReadyFn = (context: ProactiveContext) => void;

/**
 * Parameters for starting a proactive RAG session.
 */
export interface ProactiveRagSessionParams {
  /** Initial conversation state */
  conversation: Conversation;
  /** Callback when context is ready for injection */
  onContextReady: OnContextReadyFn;
}

/**
 * A proactive RAG session that monitors conversation and searches memory.
 */
export interface ProactiveRagSession {
  /** Update the session with new conversation state */
  update(conversation: Conversation): void;
  /** Update the session with action results from tool calls (for mid-execution discovery) */
  updateWithActions(conversation: Conversation, actionResults: string[]): void;
  /** Get ready context if available (non-blocking) */
  getReadyContext(): ProactiveContext | undefined;
  /** Check if context with given ID was already injected */
  wasInjected(contextId: string): boolean;
  /** Mark context as injected */
  markInjected(contextId: string): void;
  /** Get the session configuration */
  getConfig(): ProactiveRagConfig;
  /** Stop the session and cleanup */
  stop(): void;
}
