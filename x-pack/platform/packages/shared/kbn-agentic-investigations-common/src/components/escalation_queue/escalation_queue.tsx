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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EscalationQueueItem, EscalationStatus } from './types';
import { EscalationCard } from './escalation_card';
import { ESCALATION_QUEUE_LABELS } from './translations';
import { ShowMoreFooter } from '../show_more_footer';

interface EscalationQueueProps {
  status: EscalationStatus;
  escalations: EscalationQueueItem[];
  /** Render the assignee widget for a given escalation. Injected by the page. */
  renderAssignees: (escalation: EscalationQueueItem) => React.ReactNode;
  /**
   * Total number of escalations in this bucket on the server.
   * Used for the header badge and for the "Show more (N)" button.
   * Defaults to `escalations.length` when not supplied (no button rendered).
   */
  totalItemCount?: number;
  /**
   * Called when the user clicks "Show more". The page is responsible for
   * fetching the next page and appending results to `escalations`.
   */
  onLoadMore?: () => void;
  /** If set, renders an inline error state in place of the item list. */
  error?: Error | null;
  /**
   * When provided, each escalation row becomes clickable and calls this callback
   * with the full escalation item.
   */
  onClickCard?: (escalation: EscalationQueueItem) => void;
  /** Highlights the row whose id matches this value (e.g. the flyout is open for it). */
  selectedConversationId?: string;
  /**
   * When provided, called per card to produce an href for the title link, enabling
   * Cmd/middle-click to open in a new tab and showing the URL on hover.
   */
  getHref?: (escalation: EscalationQueueItem) => string | undefined;
  /** An Impact filter is applied, so an empty list means "no match" rather than "no escalations". */
  isFiltered?: boolean;
  /**
   * Number of escalations loaded from the server before the Impact filter, so "Show more (N)"
   * stays accurate while `escalations` is narrowed. Defaults to `escalations.length`.
   */
  loadedCount?: number;
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

/**
 * One collapsible group of escalation rows — Open or Closed.
 *
 * Results accumulate as the user clicks "Show more": the badge always shows the
 * server total while the list grows one page at a time.
 */
export const EscalationQueue = memo<EscalationQueueProps>(
  ({
    status,
    escalations,
    renderAssignees,
    totalItemCount,
    onLoadMore,
    error,
    onClickCard,
    selectedConversationId,
    getHref,
    isFiltered = false,
    loadedCount,
  }) => {
    const { euiTheme } = useEuiTheme();
    const serverTotal = totalItemCount ?? escalations.length;
    const remaining = serverTotal - (loadedCount ?? escalations.length);
    const showLoadMore = onLoadMore !== undefined && remaining > 0;

    // Filtered, the badge counts the matching rows. Rows still to load may match too, so
    // the figure is a floor then.
    const badgeCount = isFiltered
      ? `${escalations.length}${remaining > 0 ? '+' : ''}`
      : serverTotal;

    const buttonContent = (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle
            size="xxs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <h3>{ESCALATION_QUEUE_LABELS[status]}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* Unfiltered, show the server total so the badge reflects the full bucket. */}
          <EuiBadge color="hollow">{badgeCount}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const loadMoreButton = showLoadMore ? (
      <ShowMoreFooter
        label={ESCALATION_QUEUE_LABELS.showMore(remaining)}
        onClick={onLoadMore}
        data-test-subj={`escalationQueueLoadMore-${status}`}
      />
    ) : null;

    const bodyContent = (() => {
      if (error) {
        return (
          <EuiPanel>
            <EuiEmptyPrompt
              iconType="warning"
              iconColor="danger"
              title={<h3>{ESCALATION_QUEUE_LABELS.loadError}</h3>}
              titleSize="xs"
            />
          </EuiPanel>
        );
      }
      if (escalations.length > 0) {
        return (
          <>
            <EuiFlexGroup direction="column" gutterSize="none">
              {escalations.map((escalation) => (
                <EscalationCard
                  key={escalation.id}
                  escalation={escalation}
                  renderAssignees={renderAssignees}
                  onClickCard={onClickCard}
                  isSelected={escalation.id === selectedConversationId}
                  href={getHref?.(escalation)}
                />
              ))}
              {/* Sibling of the cards so the last card keeps its divider above it. */}
              {loadMoreButton}
            </EuiFlexGroup>
          </>
        );
      }
      return (
        <>
          <EuiPanel>
            <EuiText size="xs" color="subdued">
              {isFiltered
                ? ESCALATION_QUEUE_LABELS.emptyQueueWithFilter
                : ESCALATION_QUEUE_LABELS.emptyQueue}
            </EuiText>
          </EuiPanel>
          {loadMoreButton}
        </>
      );
    })();

    return (
      <EuiPanel paddingSize="none" hasBorder data-test-subj={`escalationQueue-${status}`}>
        <StyledAccordion
          id={`escalation-queue-${status}`}
          buttonContent={buttonContent}
          initialIsOpen={status === 'open'}
          paddingSize="none"
          buttonProps={{
            css: css`
              &:hover {
                text-decoration: none;
              }
            `,
          }}
        >
          {bodyContent}
        </StyledAccordion>
      </EuiPanel>
    );
  }
);

EscalationQueue.displayName = 'EscalationQueue';
