/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import {
  EuiText,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  useEuiTheme,
  EuiSpacer,
  EuiIcon,
  EuiHorizontalRule,
  euiScrollBarStyles,
} from '@elastic/eui';
import { chatCommonLabels } from '../i18n';

interface ConversationPanelProps {
  onNewConversationSelect?: () => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  onNewConversationSelect,
}) => {
  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);

  const containerClassName = css`
    height: 100%;
    width: 100%;
  `;

  const titleClassName = css`
    text-transform: capitalize;
    font-weight: ${theme.euiTheme.font.weight.bold};
  `;

  const pageSectionContentClassName = css`
    width: 100%;
    display: flex;
    flex-grow: 1;
    height: 100%;
    max-block-size: var(--kbn-application--content-height);
    background-color: ${theme.euiTheme.colors.backgroundBasePlain};
    padding: ${theme.euiTheme.size.base} 0;
  `;

  const sectionBlockPaddingCLassName = css`
    padding: 0 ${theme.euiTheme.size.base};
  `;

  const createButtonRuleClassName = css`
    margin-bottom: ${theme.euiTheme.size.base};
  `;

  const scrollContainerClassName = css`
    overflow-y: auto;
    padding: 0 ${theme.euiTheme.size.base};
    ${scrollBarStyles}
  `;

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      color="transparent"
      className={pageSectionContentClassName}
    >
      <EuiFlexGroup
        direction="column"
        className={containerClassName}
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem grow={false} className={sectionBlockPaddingCLassName}>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="list" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText size="s" className={titleClassName}>
                {chatCommonLabels.chat.conversations.conversationsListTitle}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow className={scrollContainerClassName}>
          <EuiFlexGroup
            direction="column"
            className={containerClassName}
            gutterSize="none"
            responsive={false}
          >
            {/* Todo: Add conversation groups */}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule size="full" margin="none" className={createButtonRuleClassName} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className={sectionBlockPaddingCLassName}>
          <EuiButton
            iconType="newChat"
            onClick={() => {
              onNewConversationSelect?.();
            }}
          >
            {chatCommonLabels.chat.conversations.newConversationLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
