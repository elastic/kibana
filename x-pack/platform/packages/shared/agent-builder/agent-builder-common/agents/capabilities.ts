/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Set of capabilities to use when calling an agent.
 */
export interface AgentCapabilities {
  /**
   * If true, will allow the agent to return visualizations in the response.
   */
  visualizations?: boolean;
}

export type ResolvedAgentCapabilities = Required<AgentCapabilities>;

export const getKibanaDefaultAgentCapabilities = (): ResolvedAgentCapabilities => ({
  visualizations: true,
});
