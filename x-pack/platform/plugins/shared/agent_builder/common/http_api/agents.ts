/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentAccessControl,
  AgentAccessControlEntry,
  AgentDefinition,
} from '@kbn/agent-builder-common';

export type AgentResponse = Omit<AgentDefinition, 'accessControl'> & {
  access_control?: AgentAccessControl;
};

export type GetAgentResponse = AgentResponse;

export interface ListAgentResponse {
  results: AgentResponse[];
}

export type UpdateAgentResponse = AgentResponse;

export type CreateAgentResponse = AgentResponse;

export interface DeleteAgentResponse {
  success: boolean;
}

/**
 * Response shape for `GET /api/agent_builder/agents/{id}/access_control`.
 *
 * `can_manage_access_control` indicates whether the requesting user can edit access control via PUT.
 * `access_control` is always present and reflects the current persisted scope and entries.
 */
export interface GetAgentAccessControlResponse {
  can_manage_access_control: boolean;
  access_control: AgentAccessControl;
}

/** Body for `PUT /api/agent_builder/agents/{id}/access_control`. */
export interface UpdateAgentAccessControlRequestBody {
  entries: AgentAccessControlEntry[];
}

export type UpdateAgentAccessControlResponse = AgentAccessControl;
