/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentAcl, AgentAclEntry, AgentDefinition } from '@kbn/agent-builder-common';

export type GetAgentResponse = AgentDefinition;

export interface ListAgentResponse {
  results: AgentDefinition[];
}

export type UpdateAgentResponse = AgentDefinition;

export type CreateAgentResponse = AgentDefinition;

export interface DeleteAgentResponse {
  success: boolean;
}

/**
 * Response shape for `GET /api/agent_builder/agents/{id}/acl`.
 *
 * `can_manage` indicates whether the requesting user can edit the ACL via PUT.
 * `acl` is always present and reflects the current persisted entries.
 */
export interface GetAgentAclResponse {
  can_manage: boolean;
  acl: AgentAcl;
}

/** Body for `PUT /api/agent_builder/agents/{id}/acl`. */
export interface UpdateAgentAclRequestBody {
  entries: AgentAclEntry[];
}

export type UpdateAgentAclResponse = AgentAcl;
