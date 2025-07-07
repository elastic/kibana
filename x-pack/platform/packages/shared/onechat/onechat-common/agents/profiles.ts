/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentType } from './descriptor';
import type { PlainIdAgentIdentifier } from './identifiers';
import type { ToolSelection } from '../tools';

export interface AgentProfile {
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
  configuration: ChatAgentConfiguration;
}

export interface ChatAgentConfiguration {
  additional_prompt?: string;
  tools: ToolSelection[]; // TODO: change shape too.
}
