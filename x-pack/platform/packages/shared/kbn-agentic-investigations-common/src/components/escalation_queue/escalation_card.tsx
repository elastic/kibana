/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EscalationQueueItem } from './types';
import { EscalationMetaInfo } from './escalation_meta_info';
import { LinkedInvestigationsBadge } from './linked_investigations_badge';
import { ESCALATION_QUEUE_LABELS } from './translations';

interface EscalationCardProps {
  escalation: EscalationQueueItem;
  hasBorder: boolean;
  /** Render the assignee widget. Supplied by the page so hook calls stay outside the package. */
  renderAssignees: (escalation: EscalationQueueItem) => React.ReactNode;
}

/**
 * One row in the escalation queue.
 *
 * The row is intentionally **not** interactive (no `role="button"`/`onClick`) because
 * row-level navigation has not been built yet. The only interactive element is the
 * assignee widget injected via `renderAssignees`.
 */
export const EscalationCard = memo<EscalationCardProps>(
  ({ escalation, hasBorder, renderAssignees }) => {
    const { euiTheme } = useEuiTheme();
    const isClosed = escalation.status === 'closed';

    return (
      <EuiPanel
        paddingSize="l"
        borderRadius="none"
        hasBorder={false}
        hasShadow={false}
        css={{
          borderBottom: hasBorder ? `1px solid ${euiTheme.colors.disabled}` : 'none',
          borderRadius: hasBorder ? 'none' : `0 0 ${euiTheme.size.s} ${euiTheme.size.s}`,
          boxSizing: 'border-box',
          boxShadow: 'none',
        }}
        data-test-subj={`escalationCard-${escalation.id}`}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="l"
          responsive
          justifyContent="spaceBetween"
          direction="row"
        >
          {/* Left: status badge (closed only) + timestamps + title */}
          <EuiFlexItem grow={true}>
            <EuiFlexGroup gutterSize="xs" responsive direction="column">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  {isClosed && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{ESCALATION_QUEUE_LABELS.closedBadge}</EuiBadge>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EscalationMetaInfo
                      createdAt={escalation.createdAt}
                      updatedAt={escalation.updatedAt}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <span css={{ color: isClosed ? euiTheme.colors.subduedText : undefined }}>
                    <EuiTextTruncate text={escalation.title} />
                  </span>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Right: linked-investigations badge, assignees, chevron */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                {escalation.linkedInvestigationCount > 0 ? (
                  <LinkedInvestigationsBadge count={escalation.linkedInvestigationCount} />
                ) : (
                  <EuiText size="xs" color="subdued">
                    {ESCALATION_QUEUE_LABELS.nothingAttached}
                  </EuiText>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{renderAssignees(escalation)}</EuiFlexItem>
              {/* Chevron: purely visual — kept for parity with the mock but does nothing yet. */}
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type="chevronSingleRight"
                  color="subdued"
                  aria-hidden="true"
                  data-test-subj={`escalationCardChevron-${escalation.id}`}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

EscalationCard.displayName = 'EscalationCard';
