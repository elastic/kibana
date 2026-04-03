/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { isMac } from '@kbn/shared-ux-utility';

import {
  CONDENSED_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH,
  UnifiedSidebar,
} from './unified_sidebar/unified_sidebar';
import { useLayoutContext } from '../../context/layout_context';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const { isCondensed, toggleCondensed } = useLayoutContext();

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.code === 'Period' || event.key === '.') &&
        (isMac ? event.metaKey : event.ctrlKey)
      ) {
        event.preventDefault();
        toggleCondensed();
      }
    },
    [toggleCondensed]
  );

  const sidebarStyles = css`
    @media (max-width: ${euiTheme.breakpoint.m - 1}px) {
      display: none;
    }
  `;

  const contentStyles = css`
    overflow: hidden;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    > div {
      overflow: hidden;
      height: 100%;
    }
  `;

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <KibanaPageTemplate
        paddingSize="none"
        restrictWidth={false}
        responsive={[]}
        pageSideBar={
          <UnifiedSidebar isCondensed={isCondensed} onToggleCondensed={toggleCondensed} />
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
