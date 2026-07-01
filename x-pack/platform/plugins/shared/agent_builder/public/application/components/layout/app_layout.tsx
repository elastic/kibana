/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import React from 'react';

import { EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { isMac } from '@kbn/shared-ux-utility';

import { UnifiedSidebar } from './unified_sidebar/unified_sidebar';
import { SidebarPopoverProvider } from './unified_sidebar/sidebar_popover_context';
import { useAgentPanelSidebarLayout } from './unified_sidebar/use_agent_panel_sidebar_layout';
import { SIDEBAR_WIDTH } from './unified_sidebar/unified_sidebar.constants';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const { containerRef, isCondensed, onToggleCondensed } = useAgentPanelSidebarLayout();

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.code === 'Period' || event.key === '.') && (isMac ? event.metaKey : event.ctrlKey)) {
      event.preventDefault();
      onToggleCondensed();
    }
  };

  const sidebarStyles = css`
    @media (max-width: ${euiTheme.breakpoint.m - 1}px) {
      display: none;
    }
  `;

  const contentWrapperStyles = css`
    position: relative;
    height: 100%;
    overflow: auto;
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  const containerStyles = css`
    display: flex;
    flex-direction: column;
    flex: 1 1 0%;
    min-height: 0;
    min-width: 0;
    width: 100%;
    height: 100%;
  `;

  const layout = (
    <KibanaPageTemplate
      paddingSize="none"
      restrictWidth={false}
      responsive={[]}
      pageSideBar={
        isCondensed ? undefined : <UnifiedSidebar onToggleCondensed={onToggleCondensed} />
      }
      pageSideBarProps={
        isCondensed
          ? undefined
          : {
              minWidth: SIDEBAR_WIDTH,
              css: sidebarStyles,
            }
      }
    >
      <KibanaPageTemplate.Section paddingSize="none" grow={true} css={contentWrapperStyles}>
        {children}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );

  return (
    <div ref={containerRef} css={containerStyles}>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      {isCondensed ? (
        <SidebarPopoverProvider onToggleCondensed={onToggleCondensed}>{layout}</SidebarPopoverProvider>
      ) : (
        layout
      )}
    </div>
  );
};
