/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PlainIdAgentIdentifier } from './identifiers';
import type { ToolSelection } from '../tools';

export interface AgentProfile {
  /**
   * Id of the agent
   */
  id: PlainIdAgentIdentifier;
  /**
   * Human-readable name for the agent.
   */
  name: string;
  /**
   * Human-readable description for the agent.
   */
  description: string;
  /**
   * Custom instructions that should be added to the prompts when calling the LLM.
   */
  customInstructions: string;
  /**
   * Tool selection for this profile, using the {@link ToolSelection} format.
   */
  toolSelection: ToolSelection[];
  /**
   * Creation date
   */
  createdAt: string;
  /**
   * Last update date.
   */
  updatedAt: string;
}
