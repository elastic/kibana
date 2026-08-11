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
  update_agent: boolean;
  update_access_control: boolean;
}

export type AgentDefinitionWithPermissions = AgentDefinition & {
  permissions: AgentPermissions;
};

export type GetAgentResponse = AgentDefinitionWithPermissions;

export type ListAgentResponseItem = AgentDefinitionWithPermissions;

export interface ListAgentResponse {
  results: ListAgentResponseItem[];
}

export type UpdateAgentResponse = AgentDefinitionWithPermissions;

export type CreateAgentResponse = AgentDefinitionWithPermissions;

export interface DeleteAgentResponse {
  success: boolean;
}

/**
 * Configuration contributed by an agent's *type*, which always applies on top of the agent's own
 * configuration and cannot be edited on the agent. Internal API only: it exists so the UI can tell
 * type-contributed values apart from the agent's own, which the merged configuration cannot express.
 *
 * Projected rather than complete — a type's base `instructions` run to tens of kilobytes, and no
 * consumer needs them in the browser.
 */
export interface AgentBaseConfigurationItem {
  agent_id: string;
  configuration: {
    ai_indices: string[];
  };
}

export interface ListAgentBaseConfigurationResponse {
  results: AgentBaseConfigurationItem[];
}

/**
 * Response shape for `GET /api/agent_builder/agents/{id}/access_control`.
 *
 * `permissions.update_access_control` indicates whether the requesting user can edit access
 * control via PUT.
 * `access_control` is always present and reflects the current persisted scope and entries.
 */
export interface GetAgentAccessControlResponse {
  access_control: AgentAccessControl;
  permissions: Pick<AgentPermissions, 'update_access_control'>;
}

/** Body for `PUT /api/agent_builder/agents/{id}/access_control`. */
export interface UpdateAgentAccessControlRequestBody {
  entries: AgentAccessControlEntry[];
}

export type UpdateAgentAccessControlResponse = AgentAccessControl;
