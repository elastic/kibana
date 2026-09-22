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
  EuiPanel,
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
  isLoading?: boolean;
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
 */
export const EscalationQueue = memo<EscalationQueueProps>(
  ({ status, escalations, renderAssignees }) => {
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
            <h3>{ESCALATION_QUEUE_LABELS[status]}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{escalations.length}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

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
          {escalations.length > 0 ? (
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
          ) : (
            <EuiPanel>
              <EuiText size="xs" color="subdued">
                {ESCALATION_QUEUE_LABELS.emptyQueue}
              </EuiText>
            </EuiPanel>
          )}
        </StyledAccordion>
      </EuiPanel>
    );
  }
);

EscalationQueue.displayName = 'EscalationQueue';
