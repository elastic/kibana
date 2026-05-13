/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentVisibility,
  type CurrentUser,
  type UserIdAndName,
  hasAgentReadAccess,
  hasAgentUseAccess,
  hasAgentWriteAccess,
  canDeleteAgent,
  canManageAgentAcl,
  canChangeAgentVisibility,
} from '@kbn/agent-builder-common';
import type { AgentUpdateRequest } from '../../../../../../common/agents';
import type { AgentProperties } from '../storage';

const sourceToOwner = (source: AgentProperties): UserIdAndName | undefined =>
  source.created_by_name !== undefined
    ? { id: source.created_by_id, username: source.created_by_name }
    : undefined;

export const hasReadAccess = ({
  source,
  user,
  isAdmin,
}: {
  source: AgentProperties;
  user: CurrentUser;
  isAdmin: boolean;
}): boolean =>
  hasAgentReadAccess({
    visibility: source.visibility,
    owner: sourceToOwner(source),
    acl: source.acl,
    currentUser: user,
    isAdmin,
  });

export const hasUseAccess = ({
  source,
  user,
  isAdmin,
}: {
  source: AgentProperties;
  user: CurrentUser;
  isAdmin: boolean;
}): boolean =>
  hasAgentUseAccess({
    visibility: source.visibility,
    owner: sourceToOwner(source),
    acl: source.acl,
    currentUser: user,
    isAdmin,
  });

export const hasWriteAccess = ({
  source,
  user,
  isAdmin,
}: {
  source: AgentProperties;
  user: CurrentUser;
  isAdmin: boolean;
}): boolean =>
  hasAgentWriteAccess({
    visibility: source.visibility,
    owner: sourceToOwner(source),
    acl: source.acl,
    currentUser: user,
    isAdmin,
  });

export const hasDeleteAccess = ({
  source,
  user,
  isAdmin,
}: {
  source: AgentProperties;
  user: CurrentUser;
  isAdmin: boolean;
}): boolean =>
  canDeleteAgent({
    visibility: source.visibility,
    owner: sourceToOwner(source),
    acl: source.acl,
    currentUser: user,
    isAdmin,
  });

export const hasManageAclAccess = ({
  source,
  user,
  isAdmin,
  manageAcls,
}: {
  source: AgentProperties;
  user: CurrentUser;
  isAdmin: boolean;
  manageAcls: boolean;
}): boolean =>
  canManageAgentAcl({
    agentId: source.id,
    visibility: source.visibility,
    owner: sourceToOwner(source),
    acl: source.acl,
    currentUser: user,
    isAdmin,
    manageAcls,
  });

/**
 * Builds an Elasticsearch DSL filter that limits the visible agents for a non-admin user
 * to those they may at least see/list.
 *
 * A non-admin user can list an agent when any of the following holds:
 *   - the agent's visibility is not Private (Public + Shared cover the world by default), OR
 *   - the user is the agent's creator (matched on profile id and/or username), OR
 *   - the agent's ACL has a `type=user` entry naming the current user.
 *
 * V1: only user-type ACL entries are matched. Role-type grants land in V2 once the
 * upstream Elasticsearch role-listing change is in.
 */
export const buildReadAccessFilter = ({ user }: { user: CurrentUser }) => {
  const shouldClauses: Array<Record<string, unknown>> = [
    {
      bool: {
        must_not: {
          term: { visibility: AgentVisibility.Private },
        },
      },
    },
  ];

  shouldClauses.push({ term: { created_by_name: user.username } });
  if (user.id !== undefined) {
    shouldClauses.push({ term: { created_by_id: user.id } });
  }

  shouldClauses.push({
    nested: {
      path: 'acl.entries',
      query: {
        bool: {
          filter: [
            { term: { 'acl.entries.type': 'user' } },
            { term: { 'acl.entries.name': user.username } },
          ],
        },
      },
    },
  });

  return {
    bool: {
      should: shouldClauses,
      minimum_should_match: 1,
    },
  };
};

/**
 * Backwards-compatible alias. Prefer {@link buildReadAccessFilter} for new code.
 * @deprecated
 */
export const buildVisibilityReadFilter = buildReadAccessFilter;

export const validateVisibilityUpdateAccess = ({
  source,
  update,
  user,
  isAdmin,
}: {
  source: AgentProperties;
  update: AgentUpdateRequest;
  user: CurrentUser;
  isAdmin: boolean;
}): boolean => {
  const isVisibilityChange =
    update.visibility !== undefined &&
    update.visibility !== (source.visibility ?? AgentVisibility.Public);

  return (
    !isVisibilityChange ||
    canChangeAgentVisibility({
      agentId: source.id,
      visibility: source.visibility,
      owner: sourceToOwner(source),
      acl: source.acl,
      currentUser: user,
      isAdmin,
    })
  );
};
