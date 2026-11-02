/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import type {
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentDeleteRequest,
  AgentListOptions,
} from '@kbn/agent-builder-common/agents';
import type { AgentAvailabilityContext, AgentAvailabilityResult } from './builtin_definition';

export type InternalAgentDefinitionAvailabilityHandler = (
  ctx: AgentAvailabilityContext
) => MaybePromise<AgentAvailabilityResult>;

export type InternalAgentDefinition = AgentDefinition & {
  isAvailable: InternalAgentDefinitionAvailabilityHandler;
};

export interface AgentRegistry {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<InternalAgentDefinition>;
  list(opts?: AgentListOptions): Promise<InternalAgentDefinition[]>;
  create(createRequest: AgentCreateRequest): Promise<InternalAgentDefinition>;
  update(agentId: string, update: AgentUpdateRequest): Promise<InternalAgentDefinition>;
  delete(args: AgentDeleteRequest): Promise<boolean>;
}
