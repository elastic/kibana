/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import React from 'react';

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';

import { ConversationSidebarView } from './views/conversation_view';
import { ManageSidebarView } from './views/manage_view';
import { SidebarHeader } from './shared/sidebar_header';
import { useUnifiedSidebarState } from './use_unified_sidebar_state';

export interface UnifiedSidebarPanelProps {
  onToggleCondensed: () => void;
  /** When true, sidebar is shown in a popover instead of push layout. */
  isPopoverMode?: boolean;
  /** When set, constrains panel height (popover mode). */
  maxHeight?: string;
}

const sidebarContentStyles = css`
  flex: 1;
  position: relative;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
`;

export const UnifiedSidebarPanel: React.FC<UnifiedSidebarPanelProps> = ({
  onToggleCondensed,
  isPopoverMode = false,
  maxHeight,
}) => {
  const { sidebarView, agentId, pathname, getNavigationPath } = useUnifiedSidebarState();

  const sidebarStyles = css`
    width: 100%;
    height: 100%;
    max-height: ${maxHeight ?? 'none'};
    border-radius: 0;
    display: flex;
    flex-direction: column;
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
        agentId={agentId}
        getNavigationPath={getNavigationPath}
        isPopoverMode={isPopoverMode}
        onToggleCondensed={onToggleCondensed}
      />
      <EuiFlexGroup css={sidebarContentStyles}>
        {sidebarView === 'conversation' && <ConversationSidebarView />}
        {sidebarView === 'manage' && <ManageSidebarView pathname={pathname} />}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
