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
  EuiTablePagination,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EscalationQueueItem, EscalationStatus } from './types';
import { EscalationCard } from './escalation_card';
import { ESCALATION_QUEUE_LABELS } from './translations';

interface EscalationQueueProps {
  status: EscalationStatus;
  escalations: EscalationQueueItem[];
  /** Render the assignee widget for a given escalation. Injected by the page. */
  renderAssignees: (escalation: EscalationQueueItem) => React.ReactNode;
  /**
   * Total number of escalations in this bucket on the server.
   * Used for the header badge and for rendering pagination.
   * Defaults to `escalations.length` when not supplied (no pagination rendered).
   */
  totalItemCount?: number;
  /** 0-based current page index. */
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  /** If set, renders an inline error state in place of the item list. */
  error?: Error | null;
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
 * Pagination is per-bucket: each group manages its own page state independently.
 * The badge always shows `totalItemCount` so it reflects the server total, not
 * the rendered page length.
 */
export const EscalationQueue = memo<EscalationQueueProps>(
  ({
    status,
    escalations,
    renderAssignees,
    totalItemCount,
    pageIndex = 0,
    pageSize = 50,
    onPageChange,
    error,
  }) => {
    const { euiTheme } = useEuiTheme();
    const serverTotal = totalItemCount ?? escalations.length;
    const showPagination = onPageChange !== undefined && serverTotal > pageSize;

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
          {/* Show the server total so the badge reflects the full bucket, not just the current page. */}
          <EuiBadge color="hollow">{serverTotal}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

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
              {escalations.map((escalation, i) => (
                <EuiFlexItem key={escalation.id} grow={false}>
                  <EscalationCard
                    escalation={escalation}
                    hasBorder={i < escalations.length - 1}
                    renderAssignees={renderAssignees}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            {showPagination && (
              <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
                <EuiTablePagination
                  pageCount={Math.ceil(serverTotal / pageSize)}
                  activePage={pageIndex}
                  onChangePage={onPageChange}
                  itemsPerPage={pageSize}
                  showPerPageOptions={false}
                />
              </EuiPanel>
            )}
          </>
        );
      }
      return (
        <EuiPanel>
          <EuiText size="xs" color="subdued">
            {ESCALATION_QUEUE_LABELS.emptyQueue}
          </EuiText>
        </EuiPanel>
      );
    })();

    return (
      <EuiPanel
        borderRadius="none"
        css={{
          borderRadius: euiTheme.size.s,
        }}
        paddingSize="none"
        hasBorder
        data-test-subj={`escalationQueue-${status}`}
      >
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
