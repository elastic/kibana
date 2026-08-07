/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import type { AgentDefinition } from './definition';
import { agentBuilderDefaultAgentId } from './definition';
import { AgentVisibility } from './visibility';

/**
 * Checks whether the current user owns the agent.
 *
 * Stable ids are preferred when the agent document stored a `created_by_id` (profile uid or
 * realm-qualified id). Username matching is kept only for legacy documents that never stored an
 * id, so those owners are not orphaned after upgrade. That legacy path cannot distinguish
 * same-username principals across realms.
 */
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
  // Legacy docs without created_by_id: fall back to username so the original owner keeps access.
  if (
    owner.id === undefined &&
    owner.username !== undefined &&
    currentUser.username !== undefined
  ) {
    return owner.username === currentUser.username;
  }
  return false;
};

export const canChangeAgentVisibility = ({
  agentId,
  owner,
  currentUser,
  isAdmin,
}: {
  agentId?: string;
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
  isAdmin: boolean;
}): boolean =>
  // The default agent is a very special cookie, and we can't change its visibility
  agentId === agentBuilderDefaultAgentId ? false : isAdmin || isAgentOwner({ owner, currentUser });

/** Legacy agents without a visibility field are treated as Public. */
export const hasAgentReadAccess = ({
  visibility,
  owner,
  currentUser,
  isAdmin,
}: {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
  isAdmin: boolean;
}): boolean => {
  const effectiveVisibility = visibility ?? AgentVisibility.Public;
  return (
    isAdmin ||
    isAgentOwner({ owner, currentUser }) ||
    effectiveVisibility !== AgentVisibility.Private
  );
};

/** Legacy agents without a visibility field are treated as Public. */
export const hasAgentWriteAccess = ({
  visibility,
  owner,
  currentUser,
  isAdmin,
}: {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
  isAdmin: boolean;
}): boolean => {
  const effectiveVisibility = visibility ?? AgentVisibility.Public;
  return (
    isAdmin ||
    isAgentOwner({ owner, currentUser }) ||
    effectiveVisibility === AgentVisibility.Public
  );
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
  currentUser?: UserIdAndName | null;
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
    currentUser,
    isAdmin,
  });
};
