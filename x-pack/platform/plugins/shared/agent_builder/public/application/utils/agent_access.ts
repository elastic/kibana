/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentVisibility, type UserIdAndName } from '@kbn/agent-builder-common';

export interface AgentBuilderCurrentUser {
  uid?: string;
  user: {
    username: string;
    roles?: readonly string[];
  };
}

const isSuperuser = (currentUser?: AgentBuilderCurrentUser | null) =>
  currentUser?.user.roles?.includes('superuser') ?? false;

const isOwner = ({
  owner,
  currentUser,
}: {
  owner?: UserIdAndName;
  currentUser?: AgentBuilderCurrentUser | null;
}) => {
  if (!owner || !currentUser) {
    return false;
  }

  if (owner.id !== undefined && owner.id === currentUser.uid) {
    return true;
  }

  return owner.username === currentUser.user.username;
};

export const canChangeAgentVisibility = ({
  owner,
  currentUser,
}: {
  owner?: UserIdAndName;
  currentUser?: AgentBuilderCurrentUser | null;
}) => {
  return isSuperuser(currentUser) || isOwner({ owner, currentUser });
};

export const canEditAgentByVisibility = ({
  visibility,
  owner,
  currentUser,
}: {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  currentUser?: AgentBuilderCurrentUser | null;
}) => {
  if (isSuperuser(currentUser)) {
    return true;
  }

  if ((visibility ?? AgentVisibility.Public) === AgentVisibility.Public) {
    return true;
  }

  return isOwner({ owner, currentUser });
};
