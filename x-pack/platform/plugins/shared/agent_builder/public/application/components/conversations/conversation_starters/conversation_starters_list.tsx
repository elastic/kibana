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

/** Starters up to this length show as compact cards, longer ones as wider cards that wrap. */
const COMPACT_STARTER_MAX_LENGTH = 30;
const WIDE_CARD_MAX_LINES = 3;
const WIDE_CARD_MIN_WIDTH = '200px';

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
    rowGroup: css`
      align-items: flex-start;
    `,
    wideItem: css`
      flex: 0 1 calc((100% - 2 * ${euiTheme.size.base}) / 3);
      min-inline-size: ${WIDE_CARD_MIN_WIDTH};
    `,
    content: css`
      display: flex;
      align-items: flex-start;
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
      block-size: ${lineHeight};
    `,
    text: css`
      min-inline-size: 0;
      overflow-wrap: anywhere;
    `,
    compactText: css`
      white-space: nowrap;
    `,
    wideText: css`
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: ${WIDE_CARD_MAX_LINES};
      overflow: hidden;
    `,
  };
};

export interface ConversationStartersListProps {
  starters: readonly string[];
  onSelect: (starter: string) => void;
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

  const isCompact =
    !isStacked && starters.every((starter) => starter.length <= COMPACT_STARTER_MAX_LENGTH);

  return (
    <EuiFlexGroup
      role="group"
      aria-label={groupAriaLabel}
      wrap={!isStacked}
      direction={isStacked ? 'column' : 'row'}
      responsive={false}
      gutterSize={isStacked ? 's' : 'm'}
      justifyContent="center"
      css={[styles.group, !isStacked && styles.rowGroup]}
      data-test-subj="agentBuilderConversationStarters"
    >
      {starters.map((starter) => (
        <EuiFlexItem
          key={starter}
          grow={false}
          css={isCompact || isStacked ? undefined : styles.wideItem}
        >
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
                <span css={[styles.text, isCompact ? styles.compactText : styles.wideText]}>
                  {starter}
                </span>
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
