/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { EuiFlexGroup, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { storageKeys } from '../../../storage_keys';
import {
  getSidebarViewForRoute,
  getAgentIdFromPath,
  getPathWithSwitchedAgent,
} from '../../../route_config';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { getLastAgentId } from '../../../hooks/use_last_agent_id';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { ConversationSidebarView } from './views/conversation_view';
import { ManageSidebarView } from './views/manage_view';
import { SidebarHeader } from './shared/sidebar_header';

export const SIDEBAR_WIDTH = 300;
export const CONDENSED_SIDEBAR_WIDTH = 64;

interface UnifiedSidebarProps {
  isCondensed: boolean;
  onToggleCondensed: () => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  isCondensed,
  onToggleCondensed,
}) => {
  const location = useLocation();
  const sidebarView = getSidebarViewForRoute(location.pathname);
  const agentIdFromUrl = getAgentIdFromPath(location.pathname);
  const [, setStoredAgentId] = useLocalStorage<string>(storageKeys.agentId);
  const { isFetched: isAgentsFetched } = useAgentBuilderAgents();
  const validateAgentId = useValidateAgentId();
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    // Only persist agent ID when it's explicitly in the URL path
    if (isAgentsFetched && agentIdFromUrl && validateAgentId(agentIdFromUrl)) {
      setStoredAgentId(agentIdFromUrl);
    }
  }, [isAgentsFetched, agentIdFromUrl, validateAgentId, setStoredAgentId]);

  const getNavigationPath = useCallback(
    (newAgentId: string) => getPathWithSwitchedAgent(location.pathname, newAgentId),
    [location.pathname]
  );

  const sidebarStyles = css`
    width: ${isCondensed ? CONDENSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH}px;
    height: 100%;
    border-radius: 0;
    border-right: 1px solid ${euiTheme.colors.borderBaseSubdued};
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
      hasBorder={false}
      role="navigation"
      aria-label="Agent Builder navigation"
    >
      <SidebarHeader
        sidebarView={sidebarView}
        agentId={agentIdFromUrl ?? getLastAgentId()}
        getNavigationPath={getNavigationPath}
        isCondensed={isCondensed}
        onToggleCondensed={onToggleCondensed}
      />
      {!isCondensed && (
        <EuiFlexGroup css={sidebarContentStyles}>
          {sidebarView === 'conversation' && <ConversationSidebarView />}
          {sidebarView === 'manage' && <ManageSidebarView pathname={location.pathname} />}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
