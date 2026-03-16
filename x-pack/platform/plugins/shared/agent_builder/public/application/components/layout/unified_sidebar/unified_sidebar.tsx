/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';

import { storageKeys } from '../../../storage_keys';
import { getSidebarViewForRoute, getAgentIdFromPath } from '../../../route_config';
import { ConversationSidebarView } from './views/conversation_view';
import { AgentSettingsSidebarView } from './views/agent_settings_view';
import { ManageSidebarView } from './views/manage_view';

const SIDEBAR_WIDTH = 200;

export const UnifiedSidebar: React.FC = () => {
  const location = useLocation();
  const sidebarView = getSidebarViewForRoute(location.pathname);
  const agentIdFromPath = getAgentIdFromPath(location.pathname);
  const [, setStoredAgentId] = useLocalStorage<string>(storageKeys.agentId);

  useEffect(() => {
    if (agentIdFromPath) {
      setStoredAgentId(agentIdFromPath);
    }
  }, [agentIdFromPath, setStoredAgentId]);

  const sidebarStyles = css`
    width: ${SIDEBAR_WIDTH}px;
    min-width: ${SIDEBAR_WIDTH}px;
    height: 100%;
    border-radius: 0;
  `;

  return (
    <EuiPanel
      css={sidebarStyles}
      paddingSize="m"
      hasShadow={false}
      hasBorder
      role="navigation"
      aria-label="Agent Builder navigation"
    >
      {sidebarView === 'conversation' && <ConversationSidebarView pathname={location.pathname} />}
      {sidebarView === 'agentSettings' && <AgentSettingsSidebarView pathname={location.pathname} />}
      {sidebarView === 'manage' && <ManageSidebarView pathname={location.pathname} />}
    </EuiPanel>
  );
};
