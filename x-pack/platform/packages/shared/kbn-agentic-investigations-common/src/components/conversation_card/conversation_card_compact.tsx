/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from '@emotion/styled';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { type Investigation } from '../../types';
import type { BaseActionsProps } from '../actions';
import { ConversationsActionsGroup } from './actions_group';
import { ConversationMetaInfo } from './conversation_meta_info';

/** Fixed, so a longer age does not push the titles out of line. */
const AGE_COLUMN_WIDTH = '6.5rem';
/** Room for "Approved by" plus a typical display name before the label truncates. */
const OUTCOME_MAX_WIDTH = '14rem';

const StyledEuiPanel = styled(EuiPanel, {
  shouldForwardProp: (prop) => !prop.startsWith('$'),
})<{ $isSelected: boolean }>(({ theme: { euiTheme }, $isSelected }) => ({
  padding: `${euiTheme.size.s} ${euiTheme.size.l}`,
  cursor: 'pointer',
  borderRadius: 0,
  '&:not(:last-child)': {
    borderBottom: `1px solid ${euiTheme.colors.disabled}`,
  },
  // The last row rounds to the queue panel's corners so the hover fill does not
  // square them off. A footer after the rows keeps it from being the last child.
  '&:last-child': {
    borderRadius: `0 0 ${euiTheme.border.radius.panel} ${euiTheme.border.radius.panel}`,
  },
  boxSizing: 'border-box',
  backgroundColor: $isSelected ? euiTheme.colors.backgroundBaseInteractiveSelect : undefined,
  '&:hover': {
    backgroundColor: $isSelected
      ? euiTheme.colors.backgroundBaseInteractiveSelect
      : euiTheme.colors.backgroundBaseSubdued,
    boxShadow: 'none',
  },
}));

interface ConversationCardCompactProps {
  investigation: Investigation;
  isSelected?: boolean;
  /** Resolved by the caller: `Investigation` carries no decision fields. */
  outcome?: string;
  onClickRecommendedAction: BaseActionsProps['onClickRecommendedAction'];
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  chatHref?: string;
  onCopyLink: BaseActionsProps['onCopyLink'];
}

/**
 * One line per decision: no summary, no assignee, and the action reads as a label
 * beside the title rather than a control.
 */
export const ConversationCardCompact = memo<ConversationCardCompactProps>(
  ({
    investigation,
    isSelected = false,
    outcome,
    onClickRecommendedAction,
    onClickAction,
    onClickCard,
    onOpenChat,
    chatHref,
    onCopyLink,
  }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <StyledEuiPanel
        paddingSize="none"
        role="button"
        tabIndex={0}
        aria-label={investigation.title}
        aria-current={isSelected || undefined}
        borderRadius="none"
        $isSelected={isSelected}
        hasBorder={false}
        hasShadow={false}
        onClick={() => onClickCard(investigation.id)}
        onKeyDown={(event: React.KeyboardEvent) => {
          // Only the panel itself: the nested controls handle their own keys, and
          // preventDefault here would swallow them.
          if (event.target !== event.currentTarget) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClickCard(investigation.id);
          }
        }}
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false} css={{ inlineSize: AGE_COLUMN_WIDTH, flexShrink: 0 }}>
            <ConversationMetaInfo createdAt={investigation.createdAt} />
          </EuiFlexItem>
          {/* `minInlineSize: 0` lets the item shrink below its text, so the title
              truncates instead of squeezing the age and outcome onto two lines. */}
          <EuiFlexItem grow={true} css={{ minInlineSize: 0 }}>
            {/* Truncate together, so the outcome and controls keep their place. The
                native tooltip keeps the clipped tail reachable for pointer users. */}
            <EuiText
              size="s"
              title={[investigation.title, investigation.primaryActionLabel]
                .filter(Boolean)
                .join('\n')}
              css={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              <strong>{investigation.title}</strong>
              {investigation.primaryActionLabel ? (
                <EuiTextColor
                  color="subdued"
                  css={{ fontSize: '0.75rem', paddingInlineStart: euiTheme.size.s }}
                >
                  {investigation.primaryActionLabel}
                </EuiTextColor>
              ) : null}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* Tighter gutter than the row: with the divider's own margin, the outcome
                sits as far from the line as the agent icon glyph does on the other side. */}
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              {outcome ? (
                // Capped and truncating: the decider's display name can be long, and
                // unbounded it would eat the title before overflowing the row.
                <EuiFlexItem grow={false} css={{ minInlineSize: 0 }}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    title={outcome}
                    css={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxInlineSize: OUTCOME_MAX_WIDTH,
                    }}
                  >
                    {outcome}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <ConversationsActionsGroup
                  investigation={investigation}
                  onClickRecommendedAction={onClickRecommendedAction}
                  onClickAction={onClickAction}
                  onOpenChat={() => onOpenChat(investigation.id)}
                  chatHref={chatHref}
                  onCopyLink={onCopyLink}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StyledEuiPanel>
    );
  }
);

ConversationCardCompact.displayName = 'ConversationCardCompact';
