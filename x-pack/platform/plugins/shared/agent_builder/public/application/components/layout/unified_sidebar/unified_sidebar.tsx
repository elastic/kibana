/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';

import { SidebarHeader } from './shared/sidebar_header';
import { UnifiedSidebarPanel } from './unified_sidebar_panel';
import { useUnifiedSidebarState } from './use_unified_sidebar_state';
import { CONDENSED_SIDEBAR_WIDTH } from './unified_sidebar.constants';

export { CONDENSED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from './unified_sidebar.constants';

interface UnifiedSidebarProps {
  isCondensed: boolean;
  onToggleCondensed: () => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  isCondensed,
  onToggleCondensed,
}) => {
  const { sidebarView, agentId, getNavigationPath } = useUnifiedSidebarState();

  if (!isCondensed) {
    return <UnifiedSidebarPanel onToggleCondensed={onToggleCondensed} />;
  }

  const sidebarStyles = css`
    width: ${CONDENSED_SIDEBAR_WIDTH}px;
    height: 100%;
    border-radius: 0;
    display: flex;
    flex-direction: column;
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
        isCondensed={true}
        onToggleCondensed={onToggleCondensed}
      />
    </EuiPanel>
  );
};
