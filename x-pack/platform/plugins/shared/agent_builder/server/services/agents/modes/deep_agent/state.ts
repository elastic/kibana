/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deep Agent State Management
 *
 * This module defines the state annotation for the deep agent graph.
 * State is persisted across graph execution and includes:
 *
 * - **messages**: The conversation message history managed by LangGraph
 * - **skillContext**: Context for skill discovery and invocation tracking
 * - **selectedSkills**: List of skill namespaces selected for the conversation
 *
 * The state uses LangGraph's Annotation system with custom reducers for
 * merging updates during graph execution.
 *
 * @module state
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessageLike } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import type { SkillContext } from './utils/skill_discovery';
import { createSkillContext } from './utils/skill_discovery';

/**
 * Reducer for skill context that merges discovered skills and invocation history.
 *
 * This reducer handles partial updates to the SkillContext, merging:
 * - `activeSkillNamespace`: Overwrites with new value if provided
 * - `discoveredSkills`: Unions the sets of discovered skill namespaces
 * - `invocationHistory`: Appends new invocations, keeping last 50
 * - `cachedSchemas`: Merges schema caches
 *
 * @param current - The current SkillContext state
 * @param update - Partial update to merge
 * @returns The merged SkillContext
 */
const skillContextReducer = (
  current: SkillContext,
  update: Partial<SkillContext>
): SkillContext => {
  return {
    activeSkillNamespace: update.activeSkillNamespace ?? current.activeSkillNamespace,
    discoveredSkills: new Set([...current.discoveredSkills, ...(update.discoveredSkills || [])]),
    invocationHistory: [...current.invocationHistory, ...(update.invocationHistory || [])].slice(
      -50
    ), // Keep last 50 invocations
    cachedSchemas: new Map([...current.cachedSchemas, ...(update.cachedSchemas || [])]),
  };
};

/**
 * State annotation for the deep agent graph.
 *
 * Defines the shape of state that flows through the graph, including
 * message history, skill context, and selected skills for the conversation.
 *
 * @example
 * ```ts
 * const graph = new StateGraph(StateAnnotation)
 *   .addNode('agent', agentNode)
 *   .addNode('tools', toolNode)
 *   .compile();
 * ```
 */
export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  /**
   * Skill context preserved between tool executions.
   * Tracks discovered skills, active skill, and invocation history.
   */
  skillContext: Annotation<SkillContext>({
    reducer: skillContextReducer,
    default: () => createSkillContext(),
  }),
  /**
   * List of skill namespaces that have been selected for this conversation.
   * Used for dynamic tool binding during research phase.
   */
  selectedSkills: Annotation<string[]>({
    reducer: (current, update) => [...new Set([...current, ...update])],
    default: () => [],
  }),
});

/**
 * TypeScript type for the deep agent state.
 *
 * Inferred from the StateAnnotation, this type represents the full
 * state object available during graph execution.
 */
export type StateType = typeof StateAnnotation.State;
