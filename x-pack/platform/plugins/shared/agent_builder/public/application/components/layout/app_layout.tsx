/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { isMac } from '@kbn/shared-ux-utility';

import { UnifiedSidebar } from './unified_sidebar/unified_sidebar';
import { useCondensedSidebarTransition } from './unified_sidebar/use_condensed_sidebar_transition';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const [isCondensed, setIsCondensed] = useState(true);

  const {
    sidebarMinWidth,
    sidebarShellStyles,
    onSidebarShellTransitionEnd,
    ...sidebarTransitionState
  } = useCondensedSidebarTransition(isCondensed);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.code === 'Period' || event.key === '.') && (isMac ? event.metaKey : event.ctrlKey)) {
      event.preventDefault();
      setIsCondensed((v) => !v);
    }
  }, []);

  const sidebarStyles = css`
    ${sidebarShellStyles}
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
            onToggleCondensed={() => setIsCondensed((v) => !v)}
            {...sidebarTransitionState}
          />
        }
        pageSideBarProps={{
          minWidth: sidebarMinWidth,
          css: sidebarStyles,
          onTransitionEnd: onSidebarShellTransitionEnd,
        }}
      >
        <KibanaPageTemplate.Section paddingSize="none" grow={true} css={contentStyles}>
          {children}
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </>
  );
};
