/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Navigate } from 'react-router-dom-v5-compat';
import { useLocation } from 'react-router-dom';

import { appPaths } from '../../utils/app_paths';
import { getAgentIdFromPath } from '../../route_config';
import { useEffectiveSpaceDefaultAgent } from '../../hooks/use_space_default_agent';

/**
 * Pins restricted (non-`manageAgents`) users to their space's default agent.
 *
 * When the active space has an effective default agent and the user cannot
 * manage agents, opening any *other* agent's routes (e.g. via a deep link or a
 * stale bookmark) redirects back to the space default. This is a UI-only
 * restriction: the converse/API layer is intentionally left open so background,
 * preconfigured, and direct-API agent calls keep working.
 *
 * Admins and users in unconfigured spaces are unaffected. The guard is a no-op
 * until the effective default resolves (`isRestricted` stays `false` until
 * then) and only acts on `/agents/:agentId` routes, so it never interferes with
 * the management section or the common path.
 */
export const AgentRouteGuard: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { pathname } = useLocation();
  const currentAgentId = getAgentIdFromPath(pathname);
  const { effectiveDefaultAgentId, isRestricted } = useEffectiveSpaceDefaultAgent();

  if (
    isRestricted &&
    effectiveDefaultAgentId &&
    currentAgentId &&
    currentAgentId !== effectiveDefaultAgentId
  ) {
    return <Navigate to={appPaths.agent.root({ agentId: effectiveDefaultAgentId })} replace />;
  }

  return <>{children}</>;
};
