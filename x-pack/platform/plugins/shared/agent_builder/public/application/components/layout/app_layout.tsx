/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { SuppressChromeBackButton } from '@kbn/app-header';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { isMac } from '@kbn/shared-ux-utility';

import { useKibana } from '../../hooks/use_kibana';
import { searchParamNames } from '../../search_param_names';

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
    services: { analytics },
  } = useKibana();
  const history = useHistory();
  // An entry point (e.g. "Open chat" on an investigation) can ask for a collapsed sidebar via the
  // `sidebarCollapsed` search param. It is read once as the initial state and then removed from
  // the URL, so the state has a single owner and toggling never touches the URL.
  const [isCondensed, setIsCondensed] = useState(
    () =>
      new URLSearchParams(history.location.search).get(searchParamNames.sidebarCollapsed) === 'true'
  );

  useEffect(() => {
    const { pathname, search, hash, state } = history.location;
    const searchParams = new URLSearchParams(search);
    if (!searchParams.has(searchParamNames.sidebarCollapsed)) {
      return;
    }
    searchParams.delete(searchParamNames.sidebarCollapsed);
    history.replace({ pathname, search: searchParams.toString(), hash, state });
    // `history` is stable, so this runs once on mount; the param is a one-shot hint consumed by
    // the initial state above.
  }, [history]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
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
