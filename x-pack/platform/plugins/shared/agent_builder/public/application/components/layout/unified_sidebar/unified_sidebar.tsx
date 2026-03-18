/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';

import { storageKeys } from '../../../storage_keys';
import { getSidebarViewForRoute, getAgentIdFromPath } from '../../../route_config';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { ConversationSidebarView } from './views/conversation_view';
import { AgentSettingsSidebarView } from './views/agent_settings_view';
import { ManageSidebarView } from './views/manage_view';

const SIDEBAR_WIDTH = 300;

export const UnifiedSidebar: React.FC = () => {
  const location = useLocation();
  const sidebarView = getSidebarViewForRoute(location.pathname);
  const agentIdFromPath = getAgentIdFromPath(location.pathname);
  const [, setStoredAgentId] = useLocalStorage<string>(storageKeys.agentId);
  const { isFetched: isAgentsFetched } = useAgentBuilderAgents();
  const validateAgentId = useValidateAgentId();

  useEffect(() => {
    // Wait for agents to load before validating — prevents falsely skipping valid IDs during initial load
    if (isAgentsFetched && agentIdFromPath && validateAgentId(agentIdFromPath)) {
      setStoredAgentId(agentIdFromPath);
    }
  }, [isAgentsFetched, agentIdFromPath, validateAgentId, setStoredAgentId]);

  const sidebarStyles = css`
    width: ${SIDEBAR_WIDTH}px;
    height: 100%;
    border-radius: 0;
    display: flex;
    flex-direction: column;
  `;

  const sidebarContentStyles = css`
    flex: 1;
    position: relative;
    overflow: hidden;
  `;

  return (
    <EuiPanel
      css={sidebarStyles}
      paddingSize="none"
      hasShadow={false}
      hasBorder
      role="navigation"
      aria-label="Agent Builder navigation"
    >
      <EuiFlexGroup css={sidebarContentStyles}>
        {sidebarView === 'conversation' && <ConversationSidebarView />}
        {sidebarView === 'agentSettings' && (
          <AgentSettingsSidebarView pathname={location.pathname} />
        )}
        {sidebarView === 'manage' && <ManageSidebarView pathname={location.pathname} />}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
