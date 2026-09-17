/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { SuppressChromeBackButton } from '@kbn/app-header';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { isMac } from '@kbn/shared-ux-utility';

import { useIsAgentWorkspaceMount } from '../../hooks/use_navigation';
import { useKibana } from '../../hooks/use_kibana';

import { SidebarPopoverProvider } from './unified_sidebar/sidebar_popover_context';
import { useAgentPanelSidebarLayout } from './unified_sidebar/use_agent_panel_sidebar_layout';
import {
  CONDENSED_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH,
  UnifiedSidebar,
} from './unified_sidebar/unified_sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const reportSidebarToggle = (
  analytics: ReturnType<typeof useKibana>['services']['analytics'],
  nextIsCondensed: boolean
) => {
  analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
    ebt_element: AGENT_BUILDER_UI_EBT.element.sidebar,
    ebt_action: AGENT_BUILDER_UI_EBT.action.navSidebar.SIDEBAR_TOGGLE,
    ebt_detail: nextIsCondensed
      ? AGENT_BUILDER_UI_EBT.detail.sidebarToggle.CONDENSE
      : AGENT_BUILDER_UI_EBT.detail.sidebarToggle.EXPAND,
    element_kind: 'other',
  });
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();

  if (isAgentWorkspaceMount) {
    return <AgentWorkspaceAppLayout>{children}</AgentWorkspaceAppLayout>;
  }

  return <FullscreenAppLayout>{children}</FullscreenAppLayout>;
};

const FullscreenAppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { analytics },
  } = useKibana();
  const [isCondensed, setIsCondensed] = useState(false);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.code === 'Period' || event.key === '.') &&
        (isMac ? event.metaKey : event.ctrlKey)
      ) {
        event.preventDefault();
        const nextIsCondensed = !isCondensed;
        reportSidebarToggle(analytics, nextIsCondensed);
        setIsCondensed(nextIsCondensed);
      }
    },
    [analytics, isCondensed]
  );

  const sidebarStyles = css`
    @media (max-width: ${euiTheme.breakpoint.m - 1}px) {
      display: none;
    }
  `;

  const contentStyles = css`
    overflow: auto;
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  return (
    <>
      <SuppressChromeBackButton />
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <KibanaPageTemplate
        paddingSize="none"
        restrictWidth={false}
        responsive={[]}
        pageSideBar={
          <UnifiedSidebar
            isCondensed={isCondensed}
            onToggleCondensed={() => setIsCondensed((v) => !v)}
          />
        }
        pageSideBarProps={{
          minWidth: isCondensed ? CONDENSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
          css: sidebarStyles,
        }}
      >
        <KibanaPageTemplate.Section paddingSize="none" grow={true} css={contentStyles}>
          {children}
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </>
  );
};

const AgentWorkspaceAppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { analytics },
  } = useKibana();
  const { containerRef, isCondensed, onToggleCondensed } = useAgentPanelSidebarLayout();

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.code === 'Period' || event.key === '.') &&
        (isMac ? event.metaKey : event.ctrlKey)
      ) {
        event.preventDefault();
        reportSidebarToggle(analytics, !isCondensed);
        onToggleCondensed();
      }
    },
    [analytics, isCondensed, onToggleCondensed]
  );

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
        isCondensed ? undefined : (
          <UnifiedSidebar isCondensed={false} onToggleCondensed={onToggleCondensed} />
        )
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
      <SuppressChromeBackButton />
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      {isCondensed ? (
        <SidebarPopoverProvider onToggleCondensed={onToggleCondensed}>{layout}</SidebarPopoverProvider>
      ) : (
        layout
      )}
    </div>
  );
};
