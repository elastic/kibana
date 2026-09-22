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
  EuiTitle,
  useEuiTheme,
  EuiTextTruncate,
} from '@elastic/eui';
import { type Investigation } from '../../types';
import type { BaseActionsProps } from '../actions';
import { ConversationsActionsGroup } from './actions_group';
import { ConversationMetaInfo } from './conversation_meta_info';

interface ConversationCardProps {
  investigation: Investigation;
  hasBorder: boolean;
  /** Marks the card whose details flyout is currently open. */
  isSelected?: boolean;
  onClickRecommendedAction: BaseActionsProps['onClickRecommendedAction'];
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  /** URL for this card's chat, so its control renders as a link. */
  chatHref?: string;
  /** When true escalation actions are shown. Requires the manage escalations capability. */
  canManageEscalations?: boolean;
}

export const ConversationCard = memo<ConversationCardProps>(
  ({
    investigation,
    hasBorder,
    isSelected = false,
    onClickRecommendedAction,
    onClickAction,
    onClickCard,
    onOpenChat,
    chatHref,
    canManageEscalations,
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
          // Asymmetric by design — off EUI's padding scale, which has no 20px step.
          padding: '20px 16px 24px 24px',
          cursor: 'pointer',
          borderBottom: hasBorder ? `1px solid ${euiTheme.colors.disabled}` : 'none',
          borderRadius: hasBorder ? 'none' : `0 0 ${euiTheme.size.s} ${euiTheme.size.s}`,
          boxSizing: 'border-box',
          boxShadow: 'none',
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
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClickCard(investigation.id);
          }
        }}
      >
        {/* The age and the actions share the top row, which leaves the title and
            summary the full width of the card rather than the actions' leftovers. */}
        <EuiFlexGroup gutterSize="xs" responsive direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="l"
              responsive={false}
              justifyContent="spaceBetween"
              direction="row"
            >
              <EuiFlexItem grow={false}>
                <ConversationMetaInfo createdAt={investigation.createdAt} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConversationsActionsGroup
                  investigation={investigation}
                  onClickRecommendedAction={onClickRecommendedAction}
                  onClickAction={onClickAction}
                  onOpenChat={() => onOpenChat(investigation.id)}
                  chatHref={chatHref}
                  canManageEscalations={canManageEscalations}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <EuiTextTruncate text={investigation.title} />
            </EuiTitle>
          </EuiFlexItem>
          {investigation.summary ? (
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <EuiTextTruncate text={investigation.summary} />
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

ConversationCard.displayName = 'ConversationCard';
