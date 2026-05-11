/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { SuppressChromeBackButton } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../hooks/use_kibana';

import { useKibana } from '../../hooks/use_kibana';

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
  const [isCondensed, setIsCondensed] = useState(false);
  const {
    services: { hotkeys },
  } = useKibana();

  useEffect(() => {
    const handle = hotkeys.register(
      {
        id: 'agentBuilder:toggleCondensedSidebar',
        keys: 'Mod+.',
        scope: 'global',
        label: i18n.translate('xpack.agentBuilder.layout.toggleCondensedSidebarShortcutLabel', {
          defaultMessage: 'Toggle condensed sidebar',
        }),
      },
      (event) => {
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
    );
    return handle.unregister;
  }, [hotkeys, isCondensed, analytics]);

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
