/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/agent-builder-common';

export type PersistedAgentDefinition = Omit<AgentDefinition, 'readonly'>;

export interface ToolRefCleanupResult {
  agentsUpdated: number;
}

export interface AgentRef {
  id: string;
  name: string;
}

export interface AgentsUsingToolsResult {
  agents: AgentRef[];
}
