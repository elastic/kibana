/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hierarchical role granted to a principal on an individual agent.
 * Each role implies all the capabilities of the lower roles.
 *
 * - Viewer:  see, list, read details
 * - User:    Viewer + run/converse
 * - Editor:  User + update fields/configuration
 * - Manager: Editor + delete + edit ACL + change visibility
 */
export enum AgentAclRole {
  Viewer = 'viewer',
  User = 'user',
  Editor = 'editor',
  Manager = 'manager',
}

export type AgentAclPrincipalType = 'user' | 'role';

export interface AgentAclEntry {
  type: AgentAclPrincipalType;
  /** Username (case-sensitive) when type='user', Kibana role name when type='role'. */
  name: string;
  role: AgentAclRole;
}

export interface AgentAcl {
  entries: AgentAclEntry[];
  /** Monotonic version stamp used for optimistic concurrency on PUT /acl. */
  version: number;
}

export const EMPTY_AGENT_ACL: AgentAcl = { entries: [], version: 0 };

export const AGENT_ACL_MAX_ENTRIES = 100;
export const AGENT_ACL_PRINCIPAL_NAME_MAX_LENGTH = 1024;

const ROLE_RANK: Record<AgentAclRole, number> = {
  [AgentAclRole.Viewer]: 1,
  [AgentAclRole.User]: 2,
  [AgentAclRole.Editor]: 3,
  [AgentAclRole.Manager]: 4,
};

export const isAgentAclRole = (value: unknown): value is AgentAclRole =>
  typeof value === 'string' && value in ROLE_RANK;

/** Returns true when `role` is at or above the `threshold` in the role hierarchy. */
export const aclRoleMeets = (role: AgentAclRole, threshold: AgentAclRole): boolean =>
  ROLE_RANK[role] >= ROLE_RANK[threshold];

/** Returns the higher of two roles, or undefined if both inputs are undefined. */
export const maxAclRole = (
  a: AgentAclRole | undefined,
  b: AgentAclRole | undefined
): AgentAclRole | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
};
