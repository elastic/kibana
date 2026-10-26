/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
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
import { createCardLinkClickHandler } from '../actions/card_link_click';

interface EscalationCardProps {
  escalation: EscalationQueueItem;
  /** Render the assignee widget. Supplied by the page so hook calls stay outside the package. */
  renderAssignees: (escalation: EscalationQueueItem) => React.ReactNode;
  /**
   * When provided the row becomes interactive (keyboard and pointer): clicking or pressing Enter/
   * Space calls this callback with the full escalation item. The assignee widget captures pointer
   * events so it does not trigger the card click.
   */
  onClickCard?: (escalation: EscalationQueueItem) => void;
  /** Renders with a highlighted background when true (e.g. the flyout for this row is open). */
  isSelected?: boolean;
  /**
   * When provided, the title becomes a real `<a>` link pointing at this URL.
   * This enables Cmd/Ctrl-click (new tab), URL preview on hover, and correct link
   * semantics for assistive technology. The link's click is intercepted so that a
   * plain click still calls `onClickCard` for in-app navigation instead of a full
   * page load.
   */
  href?: string;
}

interface StyledEuiPanelProps {
  $isClickable: boolean;
  $isSelected: boolean;
  $hasLink: boolean;
}

const StyledEuiPanel = styled(EuiPanel, {
  shouldForwardProp: (prop) => !prop.startsWith('$'),
})<StyledEuiPanelProps>(({ theme: { euiTheme }, $isClickable, $isSelected, $hasLink }) => ({
  borderRadius: 0,
  '&:not(:last-child)': {
    borderBottom: `1px solid ${euiTheme.colors.disabled}`,
  },
  // The last row rounds to the queue panel's corners so the hover fill does not
  // square them off. A footer after the rows keeps it from being the last child.
  '&:last-child': {
    borderRadius: `0 0 ${euiTheme.border.radius.panel} ${euiTheme.border.radius.panel}`,
  },
  boxSizing: 'border-box',
  cursor: $isClickable ? 'pointer' : undefined,
  backgroundColor: $isSelected ? euiTheme.colors.backgroundBaseInteractiveSelect : undefined,
  ...($isClickable && {
    '&:hover': {
      backgroundColor: $isSelected
        ? euiTheme.colors.backgroundBaseInteractiveSelect
        : euiTheme.colors.backgroundBaseSubdued,
      boxShadow: 'none',
    },
    ...(!$hasLink && {
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
      },
    }),
  }),
}));

/**
 * One row in the escalation queue.
 */
export const EscalationCard = memo<EscalationCardProps>(
  ({ escalation, renderAssignees, onClickCard, isSelected = false, href }) => {
    const { euiTheme } = useEuiTheme();
    const isClosed = escalation.status === 'closed';
    const isClickable = onClickCard !== undefined;
    // A link href promotes the row to a real navigable element; without it, fall back to the
    // button pattern so the card still works for callers that don't supply an href.
    const hasLink = href !== undefined;

    const handleClick = useCallback(() => {
      onClickCard?.(escalation);
    }, [onClickCard, escalation]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClickCard?.(escalation);
        }
      },
      [onClickCard, escalation]
    );

    // Link-mode: createCardLinkClickHandler stops propagation (so the panel's onClick does not
    // fire for the link click) and lets modified/middle clicks reach the browser for new-tab
    // support; a plain click calls onClickCard for in-app navigation.
    // useMemo (rather than useCallback) mirrors how ConversationsActionsGroup wraps this helper:
    // the factory is called inside the memo, so its deps are statically visible to the lint rule.
    const handleLinkClick = useMemo(
      () => createCardLinkClickHandler(() => onClickCard?.(escalation)),
      [onClickCard, escalation]
    );

    return (
      <StyledEuiPanel
        paddingSize="l"
        borderRadius="none"
        hasBorder={false}
        hasShadow={false}
        // Button mode (no href): expose as a keyboard-focusable button.
        // Link mode (href present): the title link is the keyboard/a11y control; the panel's
        // onClick is a convenience for mouse clicks outside the link.
        role={isClickable && !hasLink ? 'button' : undefined}
        tabIndex={isClickable && !hasLink ? 0 : undefined}
        aria-label={isClickable && !hasLink ? escalation.title : undefined}
        aria-current={isSelected || undefined}
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable && !hasLink ? handleKeyDown : undefined}
        $isClickable={isClickable}
        $isSelected={isSelected}
        $hasLink={hasLink}
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
                  {hasLink ? (
                    <EuiLink
                      href={href}
                      onClick={handleLinkClick}
                      color={isClosed ? 'subdued' : 'text'}
                      data-test-subj={`escalationCardLink-${escalation.id}`}
                    >
                      <EuiTextTruncate text={escalation.title} />
                    </EuiLink>
                  ) : (
                    <span css={{ color: isClosed ? euiTheme.colors.subduedText : undefined }}>
                      <EuiTextTruncate text={escalation.title} />
                    </span>
                  )}
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
      </StyledEuiPanel>
    );
  }
);

EscalationCard.displayName = 'EscalationCard';
