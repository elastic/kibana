/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CurrentUser, UserIdAndName } from '../base/users';
import type { AgentDefinition } from './definition';
import { agentBuilderDefaultAgentId } from './definition';
import { AgentVisibility } from './visibility';
import type { AgentAcl } from './acl';
import { AgentAclRole, aclRoleMeets, maxAclRole } from './acl';

/** Resolved authorization role on an individual agent. */
export type EffectiveAgentRole = AgentAclRole | 'owner' | 'admin';

export interface AgentAuthzArgs {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  acl?: AgentAcl;
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

const visibilityRole = (visibility?: AgentVisibility): AgentAclRole | undefined => {
  const effective = visibility ?? AgentVisibility.Public;
  switch (effective) {
    case AgentVisibility.Public:
      // Public preserves the previous behavior: anyone can read AND write.
      return AgentAclRole.Editor;
    case AgentVisibility.Shared:
      // Shared: anyone can read and run; only owner+admin can write (matches legacy).
      return AgentAclRole.User;
    case AgentVisibility.Private:
      return undefined;
  }
};

const aclRoleForUser = (
  acl: AgentAcl | undefined,
  currentUser?: CurrentUser | null
): AgentAclRole | undefined => {
  if (!acl || !currentUser) {
    return undefined;
  }
  // V1: only user-type entries. Role-type grants land in V2; see the stash branch
  // `ab/poc-agent-acl-with-roles` for the full implementation.
  let best: AgentAclRole | undefined;
  for (const entry of acl.entries) {
    if (entry.type === 'user' && currentUser.username && entry.name === currentUser.username) {
      best = maxAclRole(best, entry.role);
    }
  }
  return best;
};

/**
 * Resolves the effective role of `currentUser` on the agent described by `args`.
 * Returns `'admin'`, `'owner'`, an `AgentAclRole`, or `undefined` when the user has no access.
 *
 * Resolution order (highest wins):
 *   1. isAdmin → 'admin'
 *   2. ownership → 'owner' (implicit Manager)
 *   3. ACL grant (max of user grant and any role grants)
 *   4. visibility baseline (Public→Editor, Shared→User, Private→nothing)
 */
export const getEffectiveAgentRole = ({
  visibility,
  owner,
  acl,
  currentUser,
  isAdmin,
}: AgentAuthzArgs): EffectiveAgentRole | undefined => {
  if (isAdmin) {
    return 'admin';
  }
  if (isAgentOwner({ owner, currentUser })) {
    return 'owner';
  }
  const aclRole = aclRoleForUser(acl, currentUser);
  const baseline = visibilityRole(visibility);
  return maxAclRole(aclRole, baseline);
};

const meetsThreshold = (
  effective: EffectiveAgentRole | undefined,
  threshold: AgentAclRole
): boolean => {
  if (effective === undefined) {
    return false;
  }
  if (effective === 'admin' || effective === 'owner') {
    return true;
  }
  return aclRoleMeets(effective, threshold);
};

export const canChangeAgentVisibility = (args: AgentAuthzArgs & { agentId?: string }): boolean => {
  if (args.agentId === agentBuilderDefaultAgentId) {
    return false;
  }
  const role = getEffectiveAgentRole(args);
  return role === 'admin' || role === 'owner' || role === AgentAclRole.Manager;
};

/**
 * Whether the current user may see/list/read this agent.
 *
 * Legacy agents without a visibility field are treated as Public.
 *
 * Read and use access share the same threshold (`User`) — there is no Viewer tier.
 * Both helpers are kept as separately-named functions so call sites can document
 * intent ("I'm gating a read" vs "I'm gating a run"), but the rule is one rule.
 */
export const hasAgentReadAccess = (args: AgentAuthzArgs): boolean =>
  meetsThreshold(getEffectiveAgentRole(args), AgentAclRole.User);

/** Whether the current user may run/converse with the agent. Alias of {@link hasAgentReadAccess}. */
export const hasAgentUseAccess = (args: AgentAuthzArgs): boolean =>
  meetsThreshold(getEffectiveAgentRole(args), AgentAclRole.User);

/** Legacy agents without a visibility field are treated as Public. */
export const hasAgentWriteAccess = (args: AgentAuthzArgs): boolean =>
  meetsThreshold(getEffectiveAgentRole(args), AgentAclRole.Editor);

/** Whether the current user may delete the agent. */
export const canDeleteAgent = (args: AgentAuthzArgs): boolean =>
  meetsThreshold(getEffectiveAgentRole(args), AgentAclRole.Manager);

/**
 * Whether the current user may view/edit the agent's ACL.
 *
 * ACL management is bundled into write access on the agent: if you can write to the agent,
 * you can write to its ACL. That covers owner, effective ACL Editor/Manager grantees, and
 * (for Public agents) anyone holding the `manageAgents` Kibana sub-feature privilege.
 * Cluster admin bypasses via the `isAdmin` path in {@link hasAgentWriteAccess}.
 *
 * The default agent is excluded — it is system-owned, always Public, and must remain
 * reachable for everyone in the workspace.
 */
export const canManageAgentAcl = (args: AgentAuthzArgs & { agentId?: string }): boolean => {
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
    visibility: agent.visibility,
    owner: agent.created_by,
    acl: agent.acl,
    currentUser,
    isAdmin,
  });
};
