/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentVisibility, type UserIdAndName } from '@kbn/agent-builder-common';
import type { AgentUpdateRequest } from '../../../../../../common/agents';
import type { AgentProperties } from '../storage';

export const hasReadAccess = ({
  source,
  user,
  hasVisibilityAccessOverride,
}: {
  source: AgentProperties;
  user: UserIdAndName;
  hasVisibilityAccessOverride: boolean;
}) => {
  const visibility = source.visibility ?? AgentVisibility.Public;
  return (
    hasVisibilityAccessOverride ||
    isOwner({ source, user }) ||
    visibility !== AgentVisibility.Private
  );
};

export const hasWriteAccess = ({
  source,
  user,
  hasVisibilityAccessOverride,
}: {
  source: AgentProperties;
  user: UserIdAndName;
  hasVisibilityAccessOverride: boolean;
}) => {
  const visibility = source.visibility ?? AgentVisibility.Public;
  return (
    hasVisibilityAccessOverride ||
    isOwner({ source, user }) ||
    visibility === AgentVisibility.Public
  );
};

export const buildVisibilityReadFilter = ({ user }: { user: UserIdAndName }) => {
  const shouldClauses: Array<Record<string, unknown>> = [
    {
      bool: {
        must_not: {
          term: { visibility: AgentVisibility.Private },
        },
      },
    },
    { term: { created_by_name: user.username } },
  ];

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
  hasVisibilityAccessOverride,
}: {
  source: AgentProperties;
  update: AgentUpdateRequest;
  user: UserIdAndName;
  hasVisibilityAccessOverride: boolean;
}) => {
  const isVisibilityChange =
    update.visibility !== undefined &&
    update.visibility !== (source.visibility ?? AgentVisibility.Public);

  return !isVisibilityChange || canChangeVisibility({ source, user, hasVisibilityAccessOverride });
};

const canChangeVisibility = ({
  source,
  user,
  hasVisibilityAccessOverride,
}: {
  source: AgentProperties;
  user: UserIdAndName;
  hasVisibilityAccessOverride: boolean;
}) => hasVisibilityAccessOverride || isOwner({ source, user });

const isOwner = ({ source, user }: { source: AgentProperties; user: UserIdAndName }) =>
  (user.id !== undefined && user.id === source.created_by_id) ||
  user.username === source.created_by_name;
