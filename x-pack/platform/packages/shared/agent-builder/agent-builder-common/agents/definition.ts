/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSelection } from '../tools';

/**
 * The type of an agent.
 * Only one type for now, this enum is mostly here for future-proofing.
 */
export enum AgentType {
  chat = 'chat',
}

/**
 * ID of the agentBuilder default conversational agent
 */
export const agentBuilderDefaultAgentId = 'elastic-ai-agent';

/**
 * Definition of a agentBuilder agent.
 */
export interface AgentDefinition {
  /**
   * Id of the agent
   */
  id: string;
  /**
   * The type of the agent (only for type for now, here for future-proofing)
   */
  type: AgentType;
  /**
   * Human-readable name for the agent.
   */
  name: string;
  /**
   * Human-readable description for the agent.
   */
  description: string;
  /**
   * read-only attribute.
   * Built-in agents are readonly, user-created agent are not.
   */
  readonly: boolean;
  /**
   * Optional labels used to organize or filter agents
   */
  labels?: string[];
  /**
   * Optional avatar eui icon for built-in agents
   */
  avatar_icon?: string;
  /**
   * Optional color used to represent the agent in the UI
   */
  avatar_color?: string;
  /**
   * Optional symbol used to represent the agent in the UI
   */
  avatar_symbol?: string;
  /**
   * Configuration associated with this agent
   */
  configuration: AgentConfiguration;
}

export interface AgentConfiguration {
  /**
   * Custom instruction for the agent.
   *
   * Instructions specified that way will be added to both the research and answer prompts.
   * For custom per-step instructions, use the `research` and `answer` configuration fields instead.
   */
  instructions?: string;
  /**
   * If set to true, the custom instructions will be used as a replacement for the system prompt instead of extending it.
   *
   * This will impact both the research and answer prompts. For custom per-step instructions, use the `research` and `answer` configuration fields instead.
   */
  replace_default_instructions?: boolean;

  /**
   * List of tools exposed to the agent
   */
  tools: ToolSelection[];

  /**
   * Custom configuration for the research step of the agent.
   */
  research?: AgentResearchStepConfiguration;

  /**
   * Custom configuration for the answer step of the agent.
   */
  answer?: AgentAnswerStepConfiguration;
}

export interface AgentResearchStepConfiguration {
  /**
   * Custom instruction for the agent's research step.
   */
  instructions?: string;
  /**
   * If set to true, the custom instructions will be used as a replacement for the system prompt instead of extending it.
   */
  replace_default_instructions?: boolean;
}

export interface AgentAnswerStepConfiguration {
  /**
   * Custom instruction for the agent's answer step.
   */
  instructions?: string;
  /**
   * If set to true, the custom instructions will be used as a replacement for the system prompt instead of extending it.
   */
  replace_default_instructions?: boolean;
}

/**
 * Runtime configuration overrides for agent execution.
 * These override the stored agent configuration for a single execution instance.
 * Each field, if provided, completely replaces the corresponding field in the stored configuration.
 */
export type AgentConfigurationOverrides = Partial<AgentConfiguration>;

/**
 * Runtime configuration overrides exposed via the public API and persisted on conversation rounds.
 * Limited to `instructions` and `tools` - other fields from AgentConfigurationOverrides
 * (like research/answer step configs) are internal implementation details.
 *
 * This type is used for:
 * - API input validation (converse endpoint)
 * - Auditing: stored on ConversationRound to record what overrides were applied
 */
export type RuntimeAgentConfigurationOverrides = Pick<
  AgentConfigurationOverrides,
  'instructions' | 'tools'
>;
