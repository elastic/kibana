/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PlainIdAgentIdentifier } from './identifiers';

export enum AgentType {
  conversational = 'conversational',
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
 * IDs of the onechat default agent providers.
 */
export const oneChatAgentProviderIds = {
  default: 'onechat',
  profile: 'profile',
};

/**
 * Base descriptor for an agent.
 */
export interface AgentDescriptor {
  type: AgentType;
  agentId: PlainIdAgentIdentifier;
  providerId: string;
  description: string;
}
