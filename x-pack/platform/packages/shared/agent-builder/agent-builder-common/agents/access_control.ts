/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import { AgentVisibility } from './visibility';

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

export const canChangeAgentVisibility = ({
  owner,
  currentUser,
  hasAgentVisibilityAccessOverride,
}: {
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
  hasAgentVisibilityAccessOverride: boolean;
}): boolean => hasAgentVisibilityAccessOverride || isAgentOwner({ owner, currentUser });

/** Legacy agents without a visibility field are treated as Public. */
export const hasAgentReadAccess = ({
  visibility,
  owner,
  currentUser,
  hasAgentVisibilityAccessOverride,
}: {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
  hasAgentVisibilityAccessOverride: boolean;
}): boolean => {
  const effectiveVisibility = visibility ?? AgentVisibility.Public;
  return (
    hasAgentVisibilityAccessOverride ||
    isAgentOwner({ owner, currentUser }) ||
    effectiveVisibility !== AgentVisibility.Private
  );
};

/** Legacy agents without a visibility field are treated as Public. */
export const hasAgentWriteAccess = ({
  visibility,
  owner,
  currentUser,
  hasAgentVisibilityAccessOverride,
}: {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
  hasAgentVisibilityAccessOverride: boolean;
}): boolean => {
  const effectiveVisibility = visibility ?? AgentVisibility.Public;
  return (
    hasAgentVisibilityAccessOverride ||
    isAgentOwner({ owner, currentUser }) ||
    effectiveVisibility === AgentVisibility.Public
  );
};
