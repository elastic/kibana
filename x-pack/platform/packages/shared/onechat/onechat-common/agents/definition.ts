/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PlainIdAgentIdentifier } from './identifiers';
import type { ToolSelection } from '../tools';

/**
 * The type of an agent.
 * Only one type for now, this enum is mostly here for future-proofing.
 */
export enum AgentType {
  chat = 'chat',
}

/**
 * Execution mode for agents.
 */
export enum AgentMode {
  /**
   * Normal (Q/A) mode
   */
  normal = 'normal',
  /**
   * "Think more" mode
   */
  reason = 'reason',
  /**
   * "Plan-and-execute" mode
   */
  plan = 'plan',
  /**
   * "Deep-research" mode
   */
  research = 'research',
}

/**
 * ID of the onechat default conversational agent
 */
export const oneChatDefaultAgentId: PlainIdAgentIdentifier = 'default';

/**
 * Base descriptor for an agent.
 */
export interface AgentDescriptor {
  type: AgentType;
  agentId: PlainIdAgentIdentifier;
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
  id: PlainIdAgentIdentifier;
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
   * Configuration associated with this agent
   */
  configuration: AgentConfiguration;
}

export interface AgentConfiguration {
  additional_prompt?: string;
  tools: ToolSelection[]; // TODO: change shape too.
}
