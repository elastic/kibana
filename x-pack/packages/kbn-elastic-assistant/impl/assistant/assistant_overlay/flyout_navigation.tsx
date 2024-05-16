/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { NEW_CHAT } from '../conversations/conversation_sidepanel/translations';

export interface FlyoutNavigationProps {
  isExpanded: boolean;
  setIsExpanded?: (value: boolean) => void;
  children: React.ReactNode;
  onConversationCreate?: () => Promise<void>;
  isAssistantEnabled: boolean;
}

const VerticalSeparator = styled.div`
  :before {
    content: '';
    height: 100%;
    border-left: 1px solid ${euiThemeVars.euiColorLightShade};
  }
`;

/**
 * Navigation menu on the right panel only, with expand/collapse button and option to
 * pass in a list of actions to be displayed on top.
 */

export const FlyoutNavigation = memo<FlyoutNavigationProps>(
  ({ isExpanded, setIsExpanded, children, onConversationCreate, isAssistantEnabled }) => {
    const onToggle = useCallback(
      () => setIsExpanded && setIsExpanded(!isExpanded),
      [isExpanded, setIsExpanded]
    );

    const toggleButton = useMemo(
      () => (
        <EuiButtonIcon
          disabled={!isAssistantEnabled}
          onClick={onToggle}
          iconType={isExpanded ? 'arrowEnd' : 'arrowStart'}
          size="xs"
          aria-label={
            isExpanded
              ? i18n.translate(
                  'xpack.elasticAssistant.flyout.right.header.collapseDetailButtonAriaLabel',
                  {
                    defaultMessage: 'Hide chats',
                  }
                )
              : i18n.translate(
                  'xpack.elasticAssistant.flyout.right.header.expandDetailButtonAriaLabel',
                  {
                    defaultMessage: 'Show chats',
                  }
                )
          }
        />
      ),
      [isAssistantEnabled, isExpanded, onToggle]
    );

    return (
      <EuiPanel
        hasShadow={false}
        borderRadius="none"
        paddingSize="s"
        grow={false}
        css={css`
          border-bottom: 1px solid ${euiThemeVars.euiColorLightShade};
        `}
      >
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="none"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              {setIsExpanded && <EuiFlexItem grow={false}>{toggleButton}</EuiFlexItem>}
              {onConversationCreate && (
                <>
                  <EuiFlexItem grow={false}>
                    <VerticalSeparator />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      color="primary"
                      iconType="newChat"
                      onClick={onConversationCreate}
                      disabled={!isAssistantEnabled}
                    >
                      {NEW_CHAT}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

FlyoutNavigation.displayName = 'FlyoutNavigation';
