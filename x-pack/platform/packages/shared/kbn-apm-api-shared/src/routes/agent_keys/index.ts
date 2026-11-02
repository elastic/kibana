/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { agentKeysRoute } from './agent_keys';
import { agentKeysPrivilegesRoute } from './agent_keys_privileges';
import { invalidateAgentKeyRoute } from './invalidate_agent_key';
import { createAgentKeyRoute } from './create_agent_key';

export const agentKeysRouteDefinitions = {
  agentKeys: agentKeysRoute,
  agentKeysPrivileges: agentKeysPrivilegesRoute,
  invalidateAgentKey: invalidateAgentKeyRoute,
  createAgentKey: createAgentKeyRoute,
};

export type { AgentKeysResponse } from './agent_keys';
export type { AgentKeysPrivilegesResponse } from './agent_keys_privileges';
export type { InvalidateAgentKeyResponse } from './invalidate_agent_key';
export type { CreateAgentKeyResponse } from './create_agent_key';
