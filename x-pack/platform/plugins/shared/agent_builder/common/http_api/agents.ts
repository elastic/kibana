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

export interface AgentPermissions {
  can_edit: boolean;
  can_change_access_control: boolean;
}

export type AgentDefinitionWithPermissions = AgentDefinition & {
  permissions: AgentPermissions;
};

export type GetAgentResponse = AgentDefinitionWithPermissions;

export interface ListAgentResponse {
  results: AgentDefinitionWithPermissions[];
}

export type UpdateAgentResponse = AgentDefinition;

export type CreateAgentResponse = AgentDefinition;

export interface DeleteAgentResponse {
  success: boolean;
}

/**
 * Response shape for `GET /api/agent_builder/agents/{id}/access_control`.
 *
 * `permissions.can_change_access_control` indicates whether the requesting user can edit access
 * control via PUT.
 * `access_control` is always present and reflects the current persisted scope and entries.
 */
export interface GetAgentAccessControlResponse {
  access_control: AgentAccessControl;
  permissions: Pick<AgentPermissions, 'can_change_access_control'>;
}

/** Body for `PUT /api/agent_builder/agents/{id}/access_control`. */
export interface UpdateAgentAccessControlRequestBody {
  entries: AgentAccessControlEntry[];
}

export type UpdateAgentAccessControlResponse = AgentAccessControl;
