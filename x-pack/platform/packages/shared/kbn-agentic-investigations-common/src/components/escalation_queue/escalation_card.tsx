/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
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
  /**
   * When provided the row becomes interactive (keyboard and pointer): clicking or pressing Enter/
   * Space calls this callback with the escalation id. This is used to open the escalation details
   * flyout. The assignee widget captures pointer events so it does not trigger the card click.
   */
  onClickCard?: (id: string) => void;
  /** Renders with a highlighted background when true (e.g. the flyout for this row is open). */
  isSelected?: boolean;
}

/**
 * One row in the escalation queue.
 */
export const EscalationCard = memo<EscalationCardProps>(
  ({ escalation, hasBorder, renderAssignees, onClickCard, isSelected = false }) => {
    const { euiTheme } = useEuiTheme();
    const isClosed = escalation.status === 'closed';
    const isClickable = onClickCard !== undefined;

    const handleClick = useCallback(() => {
      onClickCard?.(escalation.id);
    }, [onClickCard, escalation.id]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClickCard?.(escalation.id);
        }
      },
      [onClickCard, escalation.id]
    );

    return (
      <EuiPanel
        paddingSize="l"
        borderRadius="none"
        hasBorder={false}
        hasShadow={false}
        // Interactive mode: add pointer cursor and keyboard/hover affordances.
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={isClickable ? escalation.title : undefined}
        aria-current={isSelected || undefined}
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        css={{
          borderBottom: hasBorder ? `1px solid ${euiTheme.colors.disabled}` : 'none',
          borderRadius: hasBorder ? 'none' : `0 0 ${euiTheme.size.s} ${euiTheme.size.s}`,
          boxSizing: 'border-box',
          boxShadow: 'none',
          cursor: isClickable ? 'pointer' : undefined,
          backgroundColor: isSelected ? euiTheme.colors.backgroundBaseInteractiveSelect : undefined,
          ...(isClickable && {
            '&:hover': {
              backgroundColor: isSelected
                ? euiTheme.colors.backgroundBaseInteractiveSelect
                : euiTheme.colors.backgroundBaseSubdued,
            },
            '&:focus-visible': {
              outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
            },
          }),
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
              {/*
               * Stop propagation so interacting with the assignee picker
               * (clicking the + button or selecting a user) does not trigger the row click.
               */}
              <EuiFlexItem
                grow={false}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
              >
                {renderAssignees(escalation)}
              </EuiFlexItem>
              {/* Chevron: visual affordance for interactive rows. */}
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
