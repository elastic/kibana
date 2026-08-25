/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import useObservable from 'react-use/lib/useObservable';

import { EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { SuppressChromeBackButton } from '@kbn/app-header';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { isMac } from '@kbn/shared-ux-utility';

import { useKibana } from '../../hooks/use_kibana';
import { sidenavPanelHost$ } from '../../panel/agent_builder_panel';

import {
  CONDENSED_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH,
  UnifiedSidebar,
} from './unified_sidebar/unified_sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { analytics, chrome },
  } = useKibana();
  const [isCondensed, setIsCondensed] = useState(false);
  const panelHost = useObservable(sidenavPanelHost$, null);
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectNav = chromeStyle === 'project';

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isProjectNav) {
        return;
      }
      if (
        (event.code === 'Period' || event.key === '.') &&
        (isMac ? event.metaKey : event.ctrlKey)
      ) {
        event.preventDefault();
        const nextIsCondensed = !isCondensed;
        analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
          ebt_element: AGENT_BUILDER_UI_EBT.element.sidebar,
          ebt_action: AGENT_BUILDER_UI_EBT.action.navSidebar.SIDEBAR_TOGGLE,
          ebt_detail: nextIsCondensed
            ? AGENT_BUILDER_UI_EBT.detail.sidebarToggle.CONDENSE
            : AGENT_BUILDER_UI_EBT.detail.sidebarToggle.EXPAND,
          element_kind: 'other',
        });
        setIsCondensed(nextIsCondensed);
      }
    },
    [analytics, isCondensed, isProjectNav]
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
      {!isProjectNav && <EuiWindowEvent event="keydown" handler={onKeyDown} />}
      {isProjectNav && panelHost
        ? createPortal(
            <UnifiedSidebar
              isCondensed={false}
              onToggleCondensed={() => undefined}
              fillContainer
              showCollapseToggle={false}
            />,
            panelHost
          )
        : null}
      <KibanaPageTemplate
        paddingSize="none"
        restrictWidth={false}
        responsive={[]}
        pageSideBar={
          isProjectNav ? undefined : (
            <UnifiedSidebar
              isCondensed={isCondensed}
              onToggleCondensed={() => setIsCondensed((v) => !v)}
            />
          )
        }
        pageSideBarProps={
          isProjectNav
            ? undefined
            : {
                minWidth: isCondensed ? CONDENSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
                css: sidebarStyles,
              }
        }
      >
        <KibanaPageTemplate.Section paddingSize="none" grow={true} css={contentStyles}>
          {children}
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </>
  );
};
