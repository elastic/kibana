/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { storageKeys } from '../../../storage_keys';
import {
  getSidebarViewForRoute,
  getAgentIdFromPath,
  getPathWithSwitchedAgent,
} from '../../../route_config';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { getLastAgentId } from '../../../hooks/use_last_agent_id';
import { useActiveSpaceId } from '../../../context/active_space_context';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';

export const useUnifiedSidebarState = () => {
  const location = useLocation();
  const sidebarView = getSidebarViewForRoute(location.pathname);
  const agentIdFromUrl = getAgentIdFromPath(location.pathname);
  const spaceId = useActiveSpaceId();
  const [, setStoredAgentId] = useLocalStorage<string>(storageKeys.getAgentIdKey(spaceId));
  const { isFetched: isAgentsFetched } = useAgentBuilderAgents();
  const validateAgentId = useValidateAgentId();

  useEffect(() => {
    if (isAgentsFetched && agentIdFromUrl && validateAgentId(agentIdFromUrl)) {
      setStoredAgentId(agentIdFromUrl);
    }
  }, [isAgentsFetched, agentIdFromUrl, validateAgentId, setStoredAgentId]);

  const getNavigationPath = useCallback(
    (newAgentId: string) => getPathWithSwitchedAgent(location.pathname, newAgentId),
    [location.pathname]
  );

  return {
    sidebarView,
    agentId: agentIdFromUrl ?? getLastAgentId(),
    pathname: location.pathname,
    getNavigationPath,
  };
};
