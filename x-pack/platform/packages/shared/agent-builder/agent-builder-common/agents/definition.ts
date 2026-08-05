/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSelection } from '../tools';
import type { UserIdAndName } from '../base/users';
import type { AgentAccessControl } from './access_control';

/**
 * Id of the default agent type
 */
export const chatAgentTypeId = 'chat';

/**
 * @deprecated agent types are now an open set of registered type ids. Use plain strings
 * (e.g. {@link chatAgentTypeId}) instead.
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
   * Id of the agent type this agent derives from.
   * Defaults to {@link chatAgentTypeId}, whose base is empty.
   */
  type: string;
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
   * Access control controls who can read, run, write, delete, and manage this agent.
   */
  access_control?: AgentAccessControl;
  /**
   * Agent owner metadata.
   */
  created_by?: UserIdAndName;
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
   */
  instructions?: string;

  /**
   * List of tools exposed to the agent
   */
  tools: ToolSelection[];

  /**
   * Optional list of skill IDs exposed to the agent.
   * When undefined, all skills are available (backward compatibility).
   */
  skill_ids?: string[];

  /**
   * When true, enables built-in Elastic capabilities for the agent.
   */
  enable_elastic_capabilities?: boolean;

  /**
   * Optional list of workflow IDs. When set, these workflows run before the agent is executed.
   */
  workflow_ids?: string[];

  /**
   * Optional list of plugin IDs assigned to this agent.
   * Skills contributed by these plugins will be available to the agent during execution.
   */
  plugin_ids?: string[];

  /**
   * Optional list of connector IDs associated with this agent.
   * When set, SML search filters connector results to only those in this list.
   * When undefined, all connectors remain visible (backward compatibility).
   */
  connector_ids?: string[];
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
 * are internal implementation details.
 *
 * This type is used for:
 * - API input validation (converse endpoint)
 * - Auditing: stored on ConversationRound to record what overrides were applied
 */
export type RuntimeAgentConfigurationOverrides = Pick<
  AgentConfigurationOverrides,
  'instructions' | 'tools'
>;
