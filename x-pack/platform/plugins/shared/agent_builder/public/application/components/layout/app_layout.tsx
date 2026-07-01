/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import React, { useCallback, useState } from 'react';

import { EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { isMac } from '@kbn/shared-ux-utility';

import { UnifiedSidebar } from './unified_sidebar/unified_sidebar';
import { SidebarPopoverProvider } from './unified_sidebar/sidebar_popover_context';
import { SIDEBAR_WIDTH } from './unified_sidebar/unified_sidebar.constants';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const [isCondensed, setIsCondensed] = useState(true);

  const onToggleCondensed = useCallback(() => setIsCondensed((value) => !value), []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.code === 'Period' || event.key === '.') && (isMac ? event.metaKey : event.ctrlKey)) {
      event.preventDefault();
      setIsCondensed((value) => !value);
    }
  }, []);

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
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      {isCondensed ? (
        <SidebarPopoverProvider onToggleCondensed={onToggleCondensed}>{layout}</SidebarPopoverProvider>
      ) : (
        layout
      )}
    </>
  );
};
