/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, MouseEvent } from 'react';
import React from 'react';
import { EuiButtonIcon, EuiIcon, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SidebarTab } from './use_sidebar_tabs';

interface SidebarTabBarProps {
  tabs: SidebarTab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
}

const MAX_TAB_WIDTH = 150;

export const SidebarTabBar: FC<SidebarTabBarProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewTab,
}) => {
  const { euiTheme } = useEuiTheme();

  const barStyles = css`
    display: flex;
    flex-direction: row;
    align-items: stretch;
    flex-shrink: 0;
    height: 34px;
    border-bottom: 1px solid ${euiTheme.colors.borderBasePlain};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    overflow: hidden;
  `;

  const scrollStyles = css`
    display: flex;
    flex-direction: row;
    align-items: stretch;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    /* Hide scrollbar but keep functionality */
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `;

  const addButtonWrapStyles = css`
    display: flex;
    align-items: center;
    padding: 0 ${euiTheme.size.xs};
    flex-shrink: 0;
    border-left: 1px solid ${euiTheme.colors.borderBasePlain};
  `;

  const getTabStyles = (isActive: boolean) => css`
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
    max-width: ${MAX_TAB_WIDTH}px;
    min-width: 60px;
    padding: 0 ${euiTheme.size.xs} 0 ${euiTheme.size.s};
    gap: ${euiTheme.size.xs};
    cursor: pointer;
    border-right: 1px solid ${euiTheme.colors.borderBasePlain};
    border-bottom: 2px solid ${isActive ? euiTheme.colors.primary : 'transparent'};
    background: ${isActive
      ? euiTheme.colors.backgroundBasePlain
      : 'transparent'};
    color: ${isActive ? euiTheme.colors.textParagraph : euiTheme.colors.textSubdued};
    user-select: none;
    &:hover {
      background: ${euiTheme.colors.backgroundBaseHovered};
    }
  `;

  const tabTitleStyles = css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    line-height: 1;
  `;

  const handleCloseClick = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    onTabClose(id);
  };

  return (
    <div css={barStyles}>
      <div css={scrollStyles}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              css={getTabStyles(isActive)}
              onClick={() => onTabClick(tab.id)}
              role="tab"
              aria-selected={isActive}
            >
              {tab.isLoading ? (
                <EuiLoadingSpinner
                  size="s"
                  css={css`flex-shrink: 0;`}
                  aria-label={i18n.translate(
                    'xpack.agentBuilder.sidebar.tabs.loadingAriaLabel',
                    { defaultMessage: 'Agent is responding' }
                  )}
                />
              ) : tab.hasUnread ? (
                <EuiIcon
                  type="dot"
                  size="s"
                  color={euiTheme.colors.success}
                  aria-label={i18n.translate(
                    'xpack.agentBuilder.sidebar.tabs.responseReadyAriaLabel',
                    { defaultMessage: 'Agent response ready' }
                  )}
                  css={css`flex-shrink: 0;`}
                />
              ) : null}
              <span css={tabTitleStyles} title={tab.title}>
                {tab.title}
              </span>
              {tabs.length > 1 && (
                <EuiButtonIcon
                  iconType="cross"
                  size="xs"
                  color="text"
                  onClick={(e) => handleCloseClick(e, tab.id)}
                  aria-label={i18n.translate(
                    'xpack.agentBuilder.sidebar.tabs.closeTabAriaLabel',
                    { defaultMessage: 'Close chat tab' }
                  )}
                  css={css`
                    flex-shrink: 0;
                    width: 16px;
                    height: 16px;
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      <div css={addButtonWrapStyles}>
        <EuiButtonIcon
          iconType="plus"
          size="xs"
          color="text"
          onClick={onNewTab}
          aria-label={i18n.translate(
            'xpack.agentBuilder.sidebar.tabs.newTabAriaLabel',
            { defaultMessage: 'New chat' }
          )}
        />
      </div>
    </div>
  );
};
