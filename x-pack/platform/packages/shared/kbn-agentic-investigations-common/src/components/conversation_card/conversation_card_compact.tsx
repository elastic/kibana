/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
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

interface ConversationCardCompactProps {
  investigation: Investigation;
  hasBorder: boolean;
  isSelected?: boolean;
  /** Resolved by the caller: `Investigation` carries no decision fields. */
  outcome?: string;
  onClickRecommendedAction: BaseActionsProps['onClickRecommendedAction'];
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  chatHref?: string;
}

/**
 * One line per decision: no summary, no assignee, and the action reads as a label
 * beside the title rather than a control.
 */
export const ConversationCardCompact = memo<ConversationCardCompactProps>(
  ({
    investigation,
    hasBorder,
    isSelected = false,
    outcome,
    onClickRecommendedAction,
    onClickAction,
    onClickCard,
    onOpenChat,
    chatHref,
  }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiPanel
        paddingSize="none"
        role="button"
        tabIndex={0}
        aria-label={investigation.title}
        aria-current={isSelected || undefined}
        borderRadius="none"
        css={{
          padding: `${euiTheme.size.s} ${euiTheme.size.l}`,
          cursor: 'pointer',
          borderBottom: hasBorder ? `1px solid ${euiTheme.colors.disabled}` : 'none',
          borderRadius: hasBorder ? 'none' : `0 0 ${euiTheme.size.s} ${euiTheme.size.s}`,
          boxSizing: 'border-box',
          backgroundColor: isSelected ? euiTheme.colors.backgroundBaseInteractiveSelect : undefined,
          '&:hover': {
            backgroundColor: isSelected
              ? euiTheme.colors.backgroundBaseInteractiveSelect
              : euiTheme.colors.backgroundBaseSubdued,
            boxShadow: 'none',
          },
        }}
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
          <EuiFlexItem grow={false} css={{ inlineSize: AGE_COLUMN_WIDTH }}>
            <ConversationMetaInfo createdAt={investigation.createdAt} />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            {/* Truncate together, so the outcome and controls keep their place. */}
            <EuiText
              size="s"
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
          {outcome ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
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
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

ConversationCardCompact.displayName = 'ConversationCardCompact';
