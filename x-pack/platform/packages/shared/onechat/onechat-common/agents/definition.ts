/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOOL_SELECTION_SCHEMA } from '../tools';
import { schema, TypeOf } from '@kbn/config-schema';

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
export const oneChatDefaultAgentId = 'elastic-ai-agent';

/**
 * Base descriptor for an agent.
 */
export interface AgentDescriptor {
  type: AgentType;
  agentId: string;
  providerId: string;
  description: string;
}

export const AGENT_CONFIGURATION_SCHEMA = schema.object({
  instructions: schema.maybe(schema.string()),
  tools: TOOL_SELECTION_SCHEMA,
});

export const AGENT_DEFINITION_SCHEMA = schema.object({
  id: schema.string(),
  type: schema.literal('chat'),
  name: schema.string(),
  description: schema.string(),
  labels: schema.maybe(schema.arrayOf(schema.string())),
  avatar_color: schema.maybe(schema.string()),
  avatar_symbol: schema.maybe(schema.string()),
  configuration: AGENT_CONFIGURATION_SCHEMA
});

export type AgentDefinition = TypeOf<typeof AGENT_DEFINITION_SCHEMA>;

export type AgentConfiguration = TypeOf<typeof AGENT_CONFIGURATION_SCHEMA>;