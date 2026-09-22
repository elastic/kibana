/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import styled from '@emotion/styled';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
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
import {
  CONVERSATION_QUEUE_COUNT_LOADING,
  EMPTY_CONVERSATION_QUEUE,
  showMoreAriaLabel,
  showMoreLabel,
} from './translations';
import { ConversationQueueSkeleton } from './conversation_queue_skeleton';
import { ConversationCard, type ConversationsActionsGroupProps } from '../conversation_card';
import { ConversationCardCompact } from '../conversation_card/conversation_card_compact';
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
  /** Rows Show more can still load. The footer hides at 0. */
  remaining?: number;
  onShowMore?: () => void;
  isLoadingMore?: boolean;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'];
  /**
   * Resolves the chat URL for a card, so its chat control renders as a link. A function rather
   * than a value because the URL is per-card and only the caller can resolve it.
   */
  getChatHref?: (id: Investigation['id']) => string | undefined;
  /**
   * How a decided row was settled, for the compact closed rows. A function for the
   * same reason as `getChatHref`: only the caller can resolve it.
   */
  getOutcomeLabel?: (id: Investigation['id']) => string | undefined;
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
    remaining = 0,
    onShowMore,
    isLoadingMore = false,
    isFiltered = false,
    onClickAction,
    onClickCard,
    onClickRecommendedAction,
    onOpenChat,
    getChatHref,
    getOutcomeLabel,
    selectedIds,
  }) => {
    const { euiTheme } = useEuiTheme();
    // Work already finished reads as a list, not as cards. Pinned to the bucket rather
    // than a prop: which bucket is done is the queue's own structure, not a caller's choice.
    const isClosedBucket = briefingType === 'closed';

    // Collapsing drops the section's query to a count-only read, so its rows empty on the
    // same frame the accordion starts animating shut — it would glide down over an empty
    // panel. Keep the last loaded rows until it opens again; while shut they are not visible.
    const [heldRows, setHeldRows] = useState(briefingList);
    if (briefingList.length > 0 && briefingList !== heldRows) {
      setHeldRows(briefingList);
    }
    const rows = isOpen ? briefingList : heldRows;

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

          {loadingRows === 0 && rows.length > 0 ? (
            <EuiFlexGroup direction="column" gutterSize="none">
              {rows.map((investigation, i) => {
                const cardProps = {
                  investigation,
                  hasBorder: i < rows.length - 1,
                  isSelected: selectedIds?.includes(investigation.id),
                  onClickAction,
                  onClickCard,
                  onOpenChat,
                  onClickRecommendedAction,
                  chatHref: getChatHref?.(investigation.id),
                };

                return (
                  <EuiFlexItem key={investigation.id} grow={false}>
                    {isClosedBucket ? (
                      <ConversationCardCompact
                        {...cardProps}
                        outcome={getOutcomeLabel?.(investigation.id)}
                      />
                    ) : (
                      <ConversationCard {...cardProps} />
                    )}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          ) : null}

          {/* EuiAccordion has no footer slot, so the control is the last child. */}
          {loadingRows === 0 && isOpen && remaining > 0 && onShowMore ? (
            <EuiFlexGroup
              justifyContent="center"
              responsive={false}
              gutterSize="none"
              css={{
                borderTop: `1px solid ${euiTheme.colors.disabled}`,
                // Keeps the button's hover fill and focus ring off the row's borders.
                padding: euiTheme.size.xs,
                // The panel sets `pointer` for the cards; only the button is clickable here.
                cursor: 'default',
              }}
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  color="text"
                  iconType="chevronSingleDown"
                  isLoading={isLoadingMore}
                  onClick={onShowMore}
                  aria-label={showMoreAriaLabel(CONVERSATION_QUEUE_LABELS[briefingType], remaining)}
                  data-test-subj={`conversationQueueShowMore-${briefingType}`}
                >
                  {showMoreLabel(remaining)}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}

          {/* Only meaningful for a section someone is looking at; rendering it mid-collapse
              is what made the empty copy flash. */}
          {loadingRows === 0 && rows.length === 0 && isOpen ? (
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
