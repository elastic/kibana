/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CurrentUser, UserIdAndName } from '../../base/users';
import type { AgentDefinition } from '../definition';
import { agentBuilderDefaultAgentId } from '../definition';
import type { AgentAccessControl } from './types';
import {
  AgentAccessControlRole,
  AgentAccessControlMode,
  accessControlRoleMeets,
  maxAccessControlRole,
} from './types';

/** Resolved authorization role on an individual agent. */
export type EffectiveAgentRole = AgentAccessControlRole | 'owner' | 'admin';

export interface AgentAuthzArgs {
  access_control?: AgentAccessControl;
  owner?: UserIdAndName;
  currentUser?: CurrentUser | null;
  isAdmin: boolean;
}

export const isAgentOwner = ({
  owner,
  currentUser,
}: {
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
}): boolean => {
  if (!owner || !currentUser) {
    return false;
  }
  if (owner.id !== undefined && currentUser.id !== undefined) {
    return owner.id === currentUser.id;
  }
  if (owner.username !== undefined && currentUser.username !== undefined) {
    return owner.username === currentUser.username;
  }
  return false;
};

const accessControlModeRole = (
  accessMode?: AgentAccessControlMode
): AgentAccessControlRole | undefined => {
  const effective = accessMode ?? AgentAccessControlMode.Public;
  switch (effective) {
    case AgentAccessControlMode.Public:
      // Public preserves the previous behavior: anyone can read AND write.
      return AgentAccessControlRole.Editor;
    case AgentAccessControlMode.Shared:
      // Shared: anyone can read and run; only owner+admin can write (matches legacy).
      return AgentAccessControlRole.User;
    case AgentAccessControlMode.Private:
      return undefined;
  }
};

const accessControlRoleForUser = (
  access_control: AgentAccessControl | undefined,
  currentUser?: CurrentUser | null
): AgentAccessControlRole | undefined => {
  if (!access_control || !currentUser) {
    return undefined;
  }
  // V1: only user-type entries. Role-type grants land in V2; see the stash branch
  // `ab/poc-agent-acl-with-roles` for the full implementation.
  let best: AgentAccessControlRole | undefined;
  for (const entry of access_control.entries) {
    if (entry.type === 'user' && currentUser.username && entry.name === currentUser.username) {
      best = maxAccessControlRole(best, entry.role);
    }
  }
  return best;
};

/**
 * Resolves the effective role of `currentUser` on the agent described by `args`.
 * Returns `'admin'`, `'owner'`, an `AgentAccessControlRole`, or `undefined` when the user has no access.
 *
 * Resolution order (highest wins):
 *   1. isAdmin → 'admin'
 *   2. ownership → 'owner' (implicit Manager)
 *   3. access-control grant (max of user grant and any role grants)
 *   4. access-control mode baseline (Public→Editor, Shared→User, Private→nothing)
 */
export const getEffectiveAgentRole = ({
  access_control,
  owner,
  currentUser,
  isAdmin,
}: AgentAuthzArgs): EffectiveAgentRole | undefined => {
  if (isAdmin) {
    return 'admin';
  }
  if (isAgentOwner({ owner, currentUser })) {
    return 'owner';
  }
  const entryRole = accessControlRoleForUser(access_control, currentUser);
  const baseline = accessControlModeRole(access_control?.access_mode);
  return maxAccessControlRole(entryRole, baseline);
};

const meetsThreshold = (
  effective: EffectiveAgentRole | undefined,
  threshold: AgentAccessControlRole
): boolean => {
  if (effective === undefined) {
    return false;
  }
  if (effective === 'admin' || effective === 'owner') {
    return true;
  }
  return accessControlRoleMeets(effective, threshold);
};

/**
 * Whether the current user may change the agent's access-control mode
 * (`Public`, `Shared`, or `Private`).
 *
 * Mode changes alter the baseline access for everyone in the workspace, so they are
 * stricter than editing access-control entries. Only admins, owners, and Manager
 * grantees may change the mode. The default agent is excluded because its mode is
 * system-owned and must remain Public.
 */
export const canChangeAgentAccessControlMode = (
  args: AgentAuthzArgs & { agentId?: string }
): boolean => {
  if (args.agentId === agentBuilderDefaultAgentId) {
    return false;
  }
  const role = getEffectiveAgentRole(args);
  return role === 'admin' || role === 'owner' || role === AgentAccessControlRole.Manager;
};

/**
 * Whether the current user may see/list/read this agent.
 *
 * Agents without access-control data are treated as Public.
 *
 * Read and use access share the same threshold (`User`) — there is no Viewer tier.
 * Both helpers are kept as separately-named functions so call sites can document
 * intent ("I'm gating a read" vs "I'm gating a run"), but the rule is one rule.
 */
export const hasAgentReadAccess = (args: AgentAuthzArgs): boolean =>
  meetsThreshold(getEffectiveAgentRole(args), AgentAccessControlRole.User);

/** Whether the current user may run/converse with the agent. Alias of {@link hasAgentReadAccess}. */
export const hasAgentUseAccess = (args: AgentAuthzArgs): boolean =>
  meetsThreshold(getEffectiveAgentRole(args), AgentAccessControlRole.User);

/** Agents without access-control data are treated as Public. */
export const hasAgentWriteAccess = (args: AgentAuthzArgs): boolean =>
  meetsThreshold(getEffectiveAgentRole(args), AgentAccessControlRole.Editor);

/** Whether the current user may delete the agent. */
export const canDeleteAgent = (args: AgentAuthzArgs): boolean =>
  meetsThreshold(getEffectiveAgentRole(args), AgentAccessControlRole.Manager);

/**
 * Whether the current user may view/edit the agent's access-control entries.
 *
 * Entry management is bundled into write access on the agent: if you can write to the
 * agent, you can grant or remove explicit access-control entries. That covers owner,
 * effective ACL Editor/Manager grantees, and (for Public agents) anyone holding the
 * `manageAgents` Kibana sub-feature privilege. Cluster admin bypasses via the `isAdmin`
 * path in {@link hasAgentWriteAccess}.
 *
 * This does not imply permission to change the access-control mode; use
 * {@link canChangeAgentAccessControlMode} for that stricter check.
 *
 * The default agent is excluded — it is system-owned, always Public, and must remain
 * reachable for everyone in the workspace.
 */
export const canManageAgentAccessControl = (
  args: AgentAuthzArgs & { agentId?: string }
): boolean => {
  if (args.agentId === agentBuilderDefaultAgentId) return false;
  return hasAgentWriteAccess(args);
};

/**
 * Whether the current user may edit agent settings, attach skills/tools, etc.
 */
export const canCurrentUserEditAgent = ({
  agent,
  manageAgents,
  currentUser,
  isAdmin,
  isCurrentUserLoading = false,
}: {
  agent: AgentDefinition;
  manageAgents: boolean;
  currentUser?: CurrentUser | null;
  isAdmin: boolean;
  /** When true deny edit to avoid flashing incorrect actions. */
  isCurrentUserLoading?: boolean;
}): boolean => {
  if (agent.readonly || !manageAgents) {
    return false;
  }

  if (isCurrentUserLoading) {
    return false;
  }

  return hasAgentWriteAccess({
    access_control: agent.access_control,
    owner: agent.created_by,
    currentUser,
    isAdmin,
  });
};
