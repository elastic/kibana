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

interface ConversationCardCompactProps {
  investigation: Investigation;
  hasBorder: boolean;
  isSelected?: boolean;
  /**
   * How the proposal was settled. Resolved by the caller, which is the only layer
   * holding the decision — `Investigation` carries no decision fields.
   */
  outcome?: string;
  onClickRecommendedAction: BaseActionsProps['onClickRecommendedAction'];
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  chatHref?: string;
}

/**
 * One line per decision, for a queue of work that is already finished: no summary and
 * no assignee, and the action reads as a label beside the title rather than a control.
 * The decided row's own actions already collapse to chat plus Open incident.
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
        paddingSize="s"
        role="button"
        tabIndex={0}
        aria-label={investigation.title}
        aria-current={isSelected || undefined}
        borderRadius="none"
        css={{
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
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <ConversationMetaInfo createdAt={investigation.createdAt} />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            {/* Title and action share one line and truncate together, so the outcome
                and the controls keep their place however long the title is. */}
            <EuiText
              size="s"
              css={{
                // Off EUI's type scale on purpose — it steps 12px to 14px, and the
                // design puts a closed row's title between the two.
                fontSize: '0.8125rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <strong>{investigation.title}</strong>
              {investigation.primaryActionLabel ? (
                <EuiTextColor color="subdued" css={{ paddingInlineStart: euiTheme.size.s }}>
                  {investigation.primaryActionLabel}
                </EuiTextColor>
              ) : null}
            </EuiText>
          </EuiFlexItem>
          {outcome ? (
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
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
