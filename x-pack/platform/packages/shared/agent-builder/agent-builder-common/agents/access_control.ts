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
  if (currentUser.id !== undefined && currentUser.id === owner.id) {
    return true;
  }
  return owner.username === currentUser.username;
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

export const hasAgentReadAccess = ({
  visibility = AgentVisibility.Public,
  owner,
  currentUser,
  hasAgentVisibilityAccessOverride,
}: {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
  hasAgentVisibilityAccessOverride: boolean;
}): boolean =>
  hasAgentVisibilityAccessOverride ||
  isAgentOwner({ owner, currentUser }) ||
  visibility !== AgentVisibility.Private;

export const hasAgentWriteAccess = ({
  visibility = AgentVisibility.Public,
  owner,
  currentUser,
  hasAgentVisibilityAccessOverride,
}: {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  currentUser?: UserIdAndName | null;
  hasAgentVisibilityAccessOverride: boolean;
}): boolean =>
  hasAgentVisibilityAccessOverride ||
  isAgentOwner({ owner, currentUser }) ||
  visibility === AgentVisibility.Public;
