/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { isMac } from '@kbn/shared-ux-utility';

import {
  CONDENSED_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH,
  UnifiedSidebar,
} from './unified_sidebar/unified_sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Shape of state we accept via `application.navigateToApp(..., { state })`
 * (or `history.push({ state })`) for the Agent Builder's initial layout.
 * Currently only used by external callers that want to open the app with
 * the side navigation collapsed (e.g. the Nightshift "Enable Nightshift"
 * deep-link).
 */
interface AppLayoutLocationState {
  sidebarCondensed?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const location = useLocation<AppLayoutLocationState | undefined>();
  // Initialize from the navigation state once, on first mount. Subsequent
  // route changes within the app are controlled by the user via the
  // condense toggle / keyboard shortcut, so we don't reset on every
  // location change.
  const [isCondensed, setIsCondensed] = useState<boolean>(
    () => location.state?.sidebarCondensed ?? false
  );

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.code === 'Period' || event.key === '.') && (isMac ? event.metaKey : event.ctrlKey)) {
      event.preventDefault();
      setIsCondensed((v) => !v);
    }
  }, []);

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
