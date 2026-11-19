/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  euiFontSize,
  useEuiMemoizedStyles,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationStarter } from '@kbn/agent-builder-common';

const groupAriaLabel = i18n.translate('xpack.agentBuilder.conversationStarters.groupAriaLabel', {
  defaultMessage: 'Conversation starters',
});

const componentStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  const { fontSize, lineHeight } = euiFontSize(euiThemeContext, 's');

  return {
    group: css`
      width: 100%;
    `,
    item: css`
      min-inline-size: 0;
      max-inline-size: 100%;
    `,
    content: css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      padding: ${euiTheme.size.s} ${euiTheme.size.m};
      text-align: left;
      font-size: ${fontSize};
      line-height: ${lineHeight};
      font-weight: ${euiTheme.font.weight.regular};
      color: ${euiTheme.colors.textParagraph};
    `,
    iconSlot: css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `,
    label: css`
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `,
  };
};

export interface ConversationStartersListProps {
  starters: readonly ConversationStarter[];
  onSelect: (starter: ConversationStarter) => void;
  isDisabled?: boolean;
  /** Stacks full-width cards in a column, for narrow containers like the flyout. */
  isStacked?: boolean;
}

export const ConversationStartersList: React.FC<ConversationStartersListProps> = ({
  starters,
  onSelect,
  isDisabled = false,
  isStacked = false,
}) => {
  const styles = useEuiMemoizedStyles(componentStyles);

  if (starters.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      role="group"
      aria-label={groupAriaLabel}
      wrap={!isStacked}
      direction={isStacked ? 'column' : 'row'}
      responsive={false}
      gutterSize={isStacked ? 's' : 'm'}
      justifyContent="center"
      css={styles.group}
      data-test-subj="agentBuilderConversationStarters"
    >
      {starters.map((starter) => (
        <EuiFlexItem key={starter.label} grow={false} css={styles.item}>
          <EuiCard
            hasBorder
            textAlign="left"
            paddingSize="none"
            titleSize="xs"
            titleElement="span"
            title={
              <span css={styles.content}>
                <span css={styles.iconSlot}>
                  {/* TODO: the design uses a plain diagonal arrow; swap "external" once EUI has one */}
                  <EuiIcon type="external" size="s" color="text" aria-hidden />
                </span>
                <span css={styles.label}>{starter.label}</span>
              </span>
            }
            isDisabled={isDisabled}
            onClick={() => onSelect(starter)}
            data-test-subj="agentBuilderConversationStarter"
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
