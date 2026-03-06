/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AgentVisibility,
  type UserIdAndName,
  canChangeAgentVisibility as canChangeAgentVisibilityCommon,
  hasAgentWriteAccess,
} from '@kbn/agent-builder-common';

export interface AgentBuilderCurrentUser {
  uid?: string;
  user: {
    username: string;
    roles?: readonly string[];
  };
}

/**
 * Maps UI current user shape to UserIdAndName for shared access-control helpers.
 */
const toUserIdAndName = (currentUser?: AgentBuilderCurrentUser | null): UserIdAndName | null =>
  currentUser ? { id: currentUser.uid, username: currentUser.user.username } : null;

/**
 * Whether the current user can change the agent's visibility.
 * Uses server-defined rules: visibility override (from API) or owner.
 * Do not use role names (e.g. superuser); the override is determined server-side via ES privilege check.
 */
export const canChangeAgentVisibility = ({
  owner,
  currentUser,
  hasAgentVisibilityAccessOverride,
}: {
  owner?: UserIdAndName;
  currentUser?: AgentBuilderCurrentUser | null;
  hasAgentVisibilityAccessOverride: boolean;
}) =>
  canChangeAgentVisibilityCommon({
    owner,
    currentUser: toUserIdAndName(currentUser),
    hasAgentVisibilityAccessOverride,
  });

/**
 * Whether the current user can edit the agent based on visibility (and owner/override).
 * Public: anyone can edit. Private/Shared: only owner or user with visibility override.
 */
export const canEditAgentByVisibility = ({
  visibility,
  owner,
  currentUser,
  hasAgentVisibilityAccessOverride,
}: {
  visibility?: AgentVisibility;
  owner?: UserIdAndName;
  currentUser?: AgentBuilderCurrentUser | null;
  hasAgentVisibilityAccessOverride: boolean;
}) =>
  hasAgentWriteAccess({
    visibility,
    owner,
    currentUser: toUserIdAndName(currentUser),
    hasAgentVisibilityAccessOverride,
  });
