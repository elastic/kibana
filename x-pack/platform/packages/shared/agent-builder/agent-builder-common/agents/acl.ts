/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlScope } from './access_control_scope';

/**
 * Hierarchical role granted to a principal on an individual agent.
 * Each role implies all the capabilities of the lower roles.
 *
 * - User:    see, list, read details, run/converse
 * - Editor:  User + update fields/configuration
 * - Manager: Editor + delete + manage access control
 *
 * Design note: there is intentionally no "Viewer" tier. If a user can see an agent at
 * all, they can run it — splitting "see" from "run" added complexity without a real
 * use case for an agent-style product.
 */
export enum AgentAccessControlRole {
  User = 'user',
  Editor = 'editor',
  Manager = 'manager',
}

/**
 * V1 only supports `'user'` principals. Role-based grants are planned for V2 once the
 * upstream Elasticsearch change for unprivileged role listing lands.
 */
export type AgentAccessControlPrincipalType = 'user';

export interface AgentAccessControlEntry {
  type: AgentAccessControlPrincipalType;
  /** Case-sensitive Kibana username. */
  name: string;
  role: AgentAccessControlRole;
}

export interface AgentAccessControl {
  scope: AgentAccessControlScope;
  entries: AgentAccessControlEntry[];
}

export const getDefaultAgentAccessControl = (): AgentAccessControl => ({
  scope: AgentAccessControlScope.Public,
  entries: [],
});

export const AGENT_ACCESS_CONTROL_MAX_ENTRIES = 100;
export const AGENT_ACCESS_CONTROL_PRINCIPAL_NAME_MAX_LENGTH = 1024;

const ROLE_RANK: Record<AgentAccessControlRole, number> = {
  [AgentAccessControlRole.User]: 1,
  [AgentAccessControlRole.Editor]: 2,
  [AgentAccessControlRole.Manager]: 3,
};

export const isAgentAccessControlRole = (value: unknown): value is AgentAccessControlRole =>
  typeof value === 'string' && value in ROLE_RANK;

/** Returns true when `role` is at or above the `threshold` in the role hierarchy. */
export const accessControlRoleMeets = (
  role: AgentAccessControlRole,
  threshold: AgentAccessControlRole
): boolean => ROLE_RANK[role] >= ROLE_RANK[threshold];

/** Returns the higher of two roles, or undefined if both inputs are undefined. */
export const maxAccessControlRole = (
  a: AgentAccessControlRole | undefined,
  b: AgentAccessControlRole | undefined
): AgentAccessControlRole | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
};
