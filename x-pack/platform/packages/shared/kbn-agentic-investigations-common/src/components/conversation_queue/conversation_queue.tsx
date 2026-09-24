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
  EuiEmptyPrompt,
  EuiIcon,
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
  CONVERSATION_QUEUE_ERROR,
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
   * The whole bucket, not the rows on screen. A spinner stands in until the first
   * response, since 0 would read as empty and then jump.
   */
  count?: number;
  /** Controlled: the caller drives its fetch from this, so EuiAccordion must not
   * keep a second copy to drift from. */
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  /** Placeholder rows while the first page is in flight, as long as the list will be. */
  loadingRows?: number;
  /** Rows failed with nothing cached. Per section: a failure must not read as empty. */
  isError?: boolean;
  /** The count failed, so the badge stands down rather than spinning forever. */
  isCountUnavailable?: boolean;
  onRetry?: () => void;
  /** The footer hides at 0. */
  remaining?: number;
  onShowMore?: () => void;
  isLoadingMore?: boolean;
  /** A later page failed over rows already on screen, which no other state shows. */
  hasLoadMoreError?: boolean;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'];
  /** A function, not a value: the URL is per-card and only the caller can resolve it. */
  getChatHref?: (id: Investigation['id']) => string | undefined;
  /** How a decided row was settled; per-card, like `getChatHref`. */
  getOutcomeLabel?: (id: Investigation['id']) => string | undefined;
  isFiltered?: boolean;
  /** Plural: the flyout shows an investigation, which several rows can share. */
  selectedIds?: readonly string[];
  /** When true escalation actions are shown on every card. Requires the manage capability. */
  canManageEscalations?: boolean;
  /**
   * Optional: render the assignee picker widget for a non-closed investigation card.
   * Supplied by the page so that hook calls stay outside this package.
   */
  renderAssignees: (investigation: Investigation) => React.ReactNode;
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
    isError = false,
    isCountUnavailable = false,
    onRetry,
    remaining = 0,
    onShowMore,
    isLoadingMore = false,
    hasLoadMoreError = false,
    isFiltered = false,
    onClickAction,
    onClickCard,
    onClickRecommendedAction,
    onOpenChat,
    getChatHref,
    getOutcomeLabel,
    selectedIds,
    canManageEscalations,
    renderAssignees,
  }) => {
    const { euiTheme } = useEuiTheme();
    // Work already finished reads as a list. Pinned to the bucket, not a prop: which
    // bucket is done is the queue's own structure.
    const isClosedBucket = briefingType === 'closed';

    // Collapsing empties the rows on the frame the accordion starts closing, so it
    // would animate over an empty panel. Hold them until it opens again.
    // Tracked only while open, empty lists included: a queue that legitimately
    // emptied must not put its old rows back on the way closed.
    const [heldRows, setHeldRows] = useState(briefingList);
    if (isOpen && briefingList !== heldRows) {
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
          {isCountUnavailable ? null : count === undefined ? (
            <EuiLoadingSpinner size="s" aria-label={CONVERSATION_QUEUE_COUNT_LOADING} />
          ) : (
            <EuiBadge color={CONVERSATION_CATEGORY_COLORS[briefingType]}>{count}</EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const rowList = (
      <EuiFlexGroup direction="column" gutterSize="none">
        {rows.map((investigation, i) => {
          // Props shared by both card variants (closed compact + open full).
          const sharedProps = {
            investigation,
            hasBorder: i < rows.length - 1,
            isSelected: selectedIds?.includes(investigation.id),
            onClickAction,
            onClickCard,
            onOpenChat,
            onClickRecommendedAction,
            chatHref: getChatHref?.(investigation.id),
            canManageEscalations,
          };

          return (
            <EuiFlexItem key={investigation.id} grow={false}>
              {isClosedBucket ? (
                <ConversationCardCompact
                  {...sharedProps}
                  outcome={getOutcomeLabel?.(investigation.id)}
                />
              ) : (
                // renderAssignees is only passed to the full card — decided rows (compact)
                // do not expose the assignee widget.
                <ConversationCard {...sharedProps} renderAssignees={renderAssignees} />
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );

    const failure = (
      // The panel sets `pointer` for the cards; only the retry is clickable here.
      <div css={{ padding: euiTheme.size.base, cursor: 'default' }}>
        <EuiEmptyPrompt
          data-test-subj={`conversationQueueError-${briefingType}`}
          color="danger"
          paddingSize="m"
          icon={<EuiIcon type="error" size="l" color="danger" aria-hidden={true} />}
          title={<h4>{CONVERSATION_QUEUE_ERROR.title}</h4>}
          titleSize="xs"
          body={
            <EuiText size="xs" color="subdued">
              {CONVERSATION_QUEUE_ERROR.body}
            </EuiText>
          }
          actions={
            onRetry ? (
              <EuiButtonEmpty
                size="s"
                iconType="refresh"
                onClick={onRetry}
                data-test-subj={`conversationQueueRetry-${briefingType}`}
              >
                {CONVERSATION_QUEUE_ERROR.retry}
              </EuiButtonEmpty>
            ) : undefined
          }
        />
      </div>
    );

    const emptyState = (
      <EuiPanel>
        <EuiText size="xs" color="subdued">
          {isFiltered
            ? EMPTY_CONVERSATION_QUEUE.emptyQueueWithFilter
            : EMPTY_CONVERSATION_QUEUE.emptyQueue}
        </EuiText>
      </EuiPanel>
    );

    /** One of four, chosen here rather than by four conditions agreeing not to overlap. */
    const renderBody = () => {
      if (loadingRows > 0) {
        return <ConversationQueueSkeleton rows={loadingRows} />;
      }
      // Rows win over a failure: a refetch failing over readable rows must not
      // replace them.
      if (rows.length > 0) {
        return rowList;
      }
      // Rendering either of the below mid-collapse is what made the copy flash.
      if (!isOpen) {
        return null;
      }
      return isError ? failure : emptyState;
    };

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
          {renderBody()}

          {/* Sits below the rows rather than replacing them, and EuiAccordion has no
              footer slot, so it is the last child. */}
          {loadingRows === 0 && isOpen && remaining > 0 && onShowMore ? (
            <EuiFlexGroup
              direction="column"
              alignItems="center"
              responsive={false}
              gutterSize="none"
              css={{
                borderTop: `1px solid ${euiTheme.colors.disabled}`,
                // Keeps the hover fill and focus ring off the row's borders.
                padding: euiTheme.size.xs,
                cursor: 'default',
              }}
            >
              {/* The rows that did load stay put; only this says the click failed,
                  and the control below it is the retry. */}
              {hasLoadMoreError ? (
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="danger"
                    role="alert"
                    data-test-subj={`conversationQueueLoadMoreError-${briefingType}`}
                  >
                    {CONVERSATION_QUEUE_ERROR.loadMore}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  color={hasLoadMoreError ? 'danger' : 'text'}
                  iconType={hasLoadMoreError ? 'refresh' : 'chevronSingleDown'}
                  isLoading={isLoadingMore}
                  onClick={onShowMore}
                  aria-label={showMoreAriaLabel(CONVERSATION_QUEUE_LABELS[briefingType], remaining)}
                  data-test-subj={`conversationQueueShowMore-${briefingType}`}
                >
                  {hasLoadMoreError ? CONVERSATION_QUEUE_ERROR.retry : showMoreLabel(remaining)}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
        </StyledAccordion>
      </EuiPanel>
    );
  }
);

ConversationQueue.displayName = 'ConversationQueue';
