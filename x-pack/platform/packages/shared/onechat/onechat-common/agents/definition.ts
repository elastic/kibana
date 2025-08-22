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
 * ID of the onechat default conversational agent
 */
export const oneChatDefaultAgentId = 'default';

/**
 * Base descriptor for an agent.
 */
export interface AgentDescriptor {
  type: AgentType;
  agentId: string;
  providerId: string;
  description: string;
}

/**
 * Definition of a onechat agent.
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
   * Optional labels used to organize or filter agents
   */
  labels?: string[];
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
   * Custom instruction for the agent
   */
  instructions?: string;
  /**
   * List of tools exposed to the agent
   */
  tools: ToolSelection[];
}
