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

/** Pins restricted users to their space's default agent. */
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
