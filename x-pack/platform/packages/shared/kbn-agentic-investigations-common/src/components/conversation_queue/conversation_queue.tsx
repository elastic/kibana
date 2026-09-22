/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from '@emotion/styled';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLoadingSpinner,
  EuiPanel,
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  CONVERSATION_CATEGORY_COLORS,
  CONVERSATION_QUEUE_LABELS,
  type Investigation,
  type RecommendedAction,
} from '../../types';
import { CONVERSATION_QUEUE_COUNT_LOADING, EMPTY_CONVERSATION_QUEUE } from './translations';
import { ConversationQueueSkeleton } from './conversation_queue_skeleton';
import { ConversationCard, type ConversationsActionsGroupProps } from '../conversation_card';
import { type BaseActionsProps } from '../actions';

interface ConversationQueueProps {
  briefingType: RecommendedAction;
  briefingList: Investigation[];
  /**
   * Size of the whole bucket on the server, not the row count — a collapsed or
   * partially loaded section still has to say how big it is. A spinner stands in
   * until the first response, since 0 would read as empty and then jump.
   */
  count?: number;
  /**
   * Controlled, because the caller drives its fetch from the open state and a second
   * copy inside EuiAccordion would drift from it.
   */
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  /**
   * Placeholder rows to render while the first page is in flight. The caller knows
   * the bucket size, so the scaffold is as long as the list is about to be.
   */
  loadingRows?: number;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'];
  /**
   * Resolves the chat URL for a card, so its chat control renders as a link. A function rather
   * than a value because the URL is per-card and only the caller can resolve it.
   */
  getChatHref?: (id: Investigation['id']) => string | undefined;
  isFiltered?: boolean;
  /**
   * Ids of the cards belonging to the open details flyout, highlighted in the list. A
   * plural because the flyout shows an investigation, which several rows can share.
   */
  selectedIds?: readonly string[];
}

const StyledAccordion = styled(EuiAccordion)`
  &.euiAccordion-isOpen {
    .euiAccordion__triggerWrapper {
      border-bottom: 1px solid ${({ theme }) => theme.euiTheme.colors.disabled};
    }
  }

  .euiAccordion__triggerWrapper {
    padding: ${({ theme }) =>
      `${theme.euiTheme.size.m} ${theme.euiTheme.size.l} ${theme.euiTheme.size.m} ${theme.euiTheme.size.m}`};
    box-sizing: border-box;
  }
`;

export const ConversationQueue = memo<ConversationQueueProps>(
  ({
    briefingType,
    briefingList,
    count,
    isOpen,
    onToggle,
    loadingRows = 0,
    isFiltered = false,
    onClickAction,
    onClickCard,
    onClickRecommendedAction,
    onOpenChat,
    getChatHref,
    selectedIds,
  }) => {
    const { euiTheme } = useEuiTheme();
    const buttonContent = (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle
            size="xxs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <h3>{CONVERSATION_QUEUE_LABELS[briefingType]}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {count === undefined ? (
            <EuiLoadingSpinner size="s" aria-label={CONVERSATION_QUEUE_COUNT_LOADING} />
          ) : (
            <EuiBadge color={CONVERSATION_CATEGORY_COLORS[briefingType]}>{count}</EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <EuiPanel
        borderRadius="none"
        css={{
          cursor: 'pointer',
          borderRadius: euiTheme.size.s,
        }}
        paddingSize="none"
        hasBorder
      >
        <StyledAccordion
          id={`conversation-container-${briefingType}`}
          buttonContent={buttonContent}
          forceState={isOpen ? 'open' : 'closed'}
          onToggle={onToggle}
          paddingSize="none"
          buttonProps={{
            css: css`
              &:hover {
                text-decoration: none;
              }
            `,
          }}
        >
          {loadingRows > 0 ? <ConversationQueueSkeleton rows={loadingRows} /> : null}

          {loadingRows === 0 && briefingList.length > 0 ? (
            <EuiFlexGroup direction="column" gutterSize="none">
              {briefingList.map((investigation, i) => (
                <EuiFlexItem key={investigation.id} grow={false}>
                  <ConversationCard
                    investigation={investigation}
                    hasBorder={i < briefingList.length - 1}
                    isSelected={selectedIds?.includes(investigation.id)}
                    onClickAction={onClickAction}
                    onClickCard={onClickCard}
                    onOpenChat={onOpenChat}
                    onClickRecommendedAction={onClickRecommendedAction}
                    chatHref={getChatHref?.(investigation.id)}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : null}

          {loadingRows === 0 && briefingList.length === 0 ? (
            <EuiPanel>
              <EuiText size="xs" color="subdued">
                {isFiltered
                  ? EMPTY_CONVERSATION_QUEUE.emptyQueueWithFilter
                  : EMPTY_CONVERSATION_QUEUE.emptyQueue}
              </EuiText>
            </EuiPanel>
          ) : null}
        </StyledAccordion>
      </EuiPanel>
    );
  }
);

ConversationQueue.displayName = 'ConversationQueue';
