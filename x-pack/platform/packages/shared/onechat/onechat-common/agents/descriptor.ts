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
 * ID of the onechat default conversational agent
 */
export const OneChatDefaultAgentId: PlainIdAgentIdentifier = 'chat_agent';

/**
 * ID of the onechat default agent's provider
 */
export const OneChatDefaultAgentProviderId = 'onechat';

/**
 * Base descriptor for an agent.
 */
export interface AgentDescriptor {
  type: AgentType;
  agentId: PlainIdAgentIdentifier;
  providerId: string;
  description: string;
}
