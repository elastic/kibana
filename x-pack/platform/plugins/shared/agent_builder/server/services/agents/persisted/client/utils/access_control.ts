/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentAccessControlScope,
  type AgentAccessControl,
  type CurrentUser,
  type UserIdAndName,
  hasAgentReadAccess,
  hasAgentUseAccess,
  hasAgentWriteAccess,
  canDeleteAgent,
  canManageAgentAccessControl,
  canChangeAgentAccessControl,
} from '@kbn/agent-builder-common';
import type { AgentUpdateRequest } from '../../../../../../common/agents';
import type { AgentProperties } from '../storage';

const sourceToOwner = (source: AgentProperties): UserIdAndName | undefined =>
  source.created_by_name !== undefined
    ? { id: source.created_by_id, username: source.created_by_name }
    : undefined;

const sourceToAccessControl = (source: AgentProperties): AgentAccessControl | undefined =>
  source.access_control;

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
    accessControl: sourceToAccessControl(source),
    owner: sourceToOwner(source),
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
    accessControl: sourceToAccessControl(source),
    owner: sourceToOwner(source),
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
    accessControl: sourceToAccessControl(source),
    owner: sourceToOwner(source),
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
    accessControl: sourceToAccessControl(source),
    owner: sourceToOwner(source),
    currentUser: user,
    isAdmin,
  });

export const hasManageAccessControlAccess = ({
  source,
  user,
  isAdmin,
}: {
  source: AgentProperties;
  user: CurrentUser;
  isAdmin: boolean;
}): boolean =>
  canManageAgentAccessControl({
    agentId: source.id,
    accessControl: sourceToAccessControl(source),
    owner: sourceToOwner(source),
    currentUser: user,
    isAdmin,
  });

/**
 * Strips `accessControl.entries` from a returned agent definition when the caller is not allowed
 * to manage the agent access control.
 */
export const redactAccessControlForCaller = <T extends { accessControl?: AgentAccessControl }>({
  definition,
  source,
  user,
  isAdmin,
}: {
  definition: T;
  source: AgentProperties;
  user: CurrentUser;
  isAdmin: boolean;
}): T => {
  if (!definition.accessControl || definition.accessControl.entries.length === 0) {
    return definition;
  }
  const canManage = hasManageAccessControlAccess({ source, user, isAdmin });
  if (canManage) {
    return definition;
  }
  return { ...definition, accessControl: { ...definition.accessControl, entries: [] } };
};

/**
 * Builds an Elasticsearch DSL filter that limits the visible agents for a non-admin user
 * to those they may at least see/list.
 *
 * A non-admin user can list an agent when any of the following holds:
 *   - the agent's scope is not Private (Public + Shared cover the world by default), OR
 *   - the user is the agent's creator (matched on profile id and/or username), OR
 *   - the agent's access-control entries have a `type=user` entry naming the current user.
 *
 * V1: only user-type ACL entries are matched. Role-type grants land in V2 once the
 * upstream Elasticsearch role-listing change is in.
 */
export const buildReadAccessFilter = ({ user }: { user: CurrentUser }) => {
  const shouldClauses: Array<Record<string, unknown>> = [
    {
      bool: {
        must_not: {
          term: { 'access_control.scope': AgentAccessControlScope.Private },
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
      path: 'access_control.entries',
      query: {
        bool: {
          filter: [
            { term: { 'access_control.entries.type': 'user' } },
            { term: { 'access_control.entries.name': user.username } },
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
export const buildAccessControlReadFilter = buildReadAccessFilter;

export const validateAccessControlUpdateAccess = ({
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
  const currentScope = source.access_control?.scope ?? AgentAccessControlScope.Public;
  const nextScope = update.accessControl?.scope;
  const isScopeChange = nextScope !== undefined && nextScope !== currentScope;

  return (
    !isScopeChange ||
    canChangeAgentAccessControl({
      agentId: source.id,
      accessControl: sourceToAccessControl(source),
      owner: sourceToOwner(source),
      currentUser: user,
      isAdmin,
    })
  );
};
