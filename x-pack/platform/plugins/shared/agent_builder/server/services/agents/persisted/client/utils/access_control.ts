/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentVisibility,
  type UserIdAndName,
  hasAgentReadAccess,
  hasAgentWriteAccess,
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
  user: UserIdAndName;
  isAdmin: boolean;
}): boolean =>
  hasAgentReadAccess({
    visibility: source.visibility,
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
  user: UserIdAndName;
  isAdmin: boolean;
}): boolean =>
  hasAgentWriteAccess({
    visibility: source.visibility,
    owner: sourceToOwner(source),
    currentUser: user,
    isAdmin,
  });

export const buildVisibilityReadFilter = ({ user }: { user: UserIdAndName }) => {
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

  return {
    bool: {
      should: shouldClauses,
      minimum_should_match: 1,
    },
  };
};

export const validateVisibilityUpdateAccess = ({
  source,
  update,
  user,
  isAdmin,
}: {
  source: AgentProperties;
  update: AgentUpdateRequest;
  user: UserIdAndName;
  isAdmin: boolean;
}): boolean => {
  const isVisibilityChange =
    update.visibility !== undefined &&
    update.visibility !== (source.visibility ?? AgentVisibility.Public);

  return (
    !isVisibilityChange ||
    canChangeAgentVisibility({
      agentId: source.id,
      owner: sourceToOwner(source),
      currentUser: user,
      isAdmin,
    })
  );
};
