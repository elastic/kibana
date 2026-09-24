/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiText,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { DetailsBlock } from './detail_block';
import { LINKED_INVESTIGATIONS_LABELS } from './translations';

export interface LinkedInvestigationItem {
  id: string;
  title: string;
  status: 'open' | 'closed';
}

export interface LinkedInvestigationsListProps {
  items: LinkedInvestigationItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onClickItem: (id: string) => void;
}

/**
 * Presentational list of linked investigations for the escalation details flyout.
 *
 * Each row renders an "Investigation" hollow badge, a truncated title, and an Open/Closed
 * status badge. Clicking or pressing Enter/Space on a row fires `onClickItem`.
 */
export const LinkedInvestigationsList = memo<LinkedInvestigationsListProps>(
  ({ items, isLoading, isError, onClickItem }) => {
    const { euiTheme } = useEuiTheme();

    let content: React.ReactNode;

    if (isLoading) {
      content = <EuiSkeletonText lines={3} data-test-subj="linkedInvestigationsLoading" />;
    } else if (isError) {
      content = (
        <EuiCallOut
          announceOnMount
          title={LINKED_INVESTIGATIONS_LABELS.errorTitle}
          color="danger"
          iconType="error"
          data-test-subj="linkedInvestigationsError"
        />
      );
    } else if (!items || items.length === 0) {
      content = (
        <EuiText size="s" color="subdued" data-test-subj="linkedInvestigationsEmpty">
          {LINKED_INVESTIGATIONS_LABELS.empty}
        </EuiText>
      );
    } else {
      content = (
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          css={css({ borderRadius: euiTheme.size.s })}
          data-test-subj="linkedInvestigationsPanel"
        >
          <EuiFlexGroup
            component="ul"
            direction="column"
            gutterSize="none"
            responsive={false}
            css={css({ margin: 0, padding: 0, listStyle: 'none' })}
          >
            {items.map((item, index) => (
              <EuiFlexItem
                key={item.id}
                component="li"
                grow={false}
                css={css({
                  borderTop: index > 0 ? euiTheme.border.thin : undefined,
                })}
              >
                {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onClickItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClickItem(item.id);
                    }
                  }}
                  css={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: euiTheme.size.s,
                    padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                    },
                    '&:focus-visible': {
                      outline: `${euiTheme.focus.width} solid ${euiTheme.focus.color}`,
                      outlineOffset: '-2px',
                    },
                  })}
                  data-test-subj={`linkedInvestigationRow-${item.id}`}
                >
                  <EuiBadge color="hollow" css={css({ flexShrink: 0 })}>
                    Investigation
                  </EuiBadge>

                  <EuiFlexItem css={css({ minWidth: 0 })}>
                    <EuiTextTruncate text={item.title} />
                  </EuiFlexItem>

                  <EuiBadge
                    color={item.status === 'open' ? 'primary' : 'default'}
                    css={css({ flexShrink: 0 })}
                    data-test-subj={`linkedInvestigationStatus-${item.id}`}
                  >
                    {item.status === 'open'
                      ? LINKED_INVESTIGATIONS_LABELS.statusOpen
                      : LINKED_INVESTIGATIONS_LABELS.statusClosed}
                  </EuiBadge>
                </div>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>
      );
    }

    return <DetailsBlock title={LINKED_INVESTIGATIONS_LABELS.sectionTitle}>{content}</DetailsBlock>;
  }
);

LinkedInvestigationsList.displayName = 'LinkedInvestigationsList';
