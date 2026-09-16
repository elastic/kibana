/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';

import { appPaths } from '../../utils/app_paths';
import { getAgentIdFromPath } from '../../route_config';
import { useEffectiveSpaceDefaultAgent } from '../../hooks/use_space_default_agent';
import { RedirectLoading } from './redirect_loading';

/** Pins restricted users to their space's default agent. */
export const AgentRouteGuard: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { pathname } = useLocation();
  const currentAgentId = getAgentIdFromPath(pathname);
  const { effectiveDefaultAgentId, isRestricted, isReady } = useEffectiveSpaceDefaultAgent();

  if (currentAgentId && !isReady) {
    return <RedirectLoading data-test-subj="agentRouteGuardLoading" />;
  }

  if (
    isRestricted &&
    effectiveDefaultAgentId &&
    currentAgentId &&
    currentAgentId !== effectiveDefaultAgentId
  ) {
    return <Redirect to={appPaths.agent.root({ agentId: effectiveDefaultAgentId })} />;
  }

  return <>{children}</>;
};
