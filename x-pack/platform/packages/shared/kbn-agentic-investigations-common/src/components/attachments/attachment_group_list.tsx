/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ATTACHMENT_GROUP_SHOW_LESS, attachmentGroupShowMore } from './translations';

export const DEFAULT_COLLAPSED_COUNT = 4;

export interface AttachmentGroupListProps {
  /** The group header label. */
  title: string;
  /** The rows to display in this group. */
  rows: React.ReactNode[];
  /**
   * Override the count shown next to the title.
   * Defaults to `rows.length` when absent.
   */
  count?: number;
  /**
   * Number of rows visible before "Show more". Defaults to DEFAULT_COLLAPSED_COUNT (4).
   * Set to `Infinity` or a number >= `rows.length` to disable collapsing.
   */
  collapsedCount?: number;
}

/** One titled group inside the attachments tab. Owns its own Show more/less toggle. */
export const AttachmentGroupList = memo<AttachmentGroupListProps>(
  ({ title, rows, count, collapsedCount = DEFAULT_COLLAPSED_COUNT }) => {
    const { euiTheme } = useEuiTheme();
    const listId = useGeneratedHtmlId({ prefix: 'attachmentGroupList' });
    const [isExpanded, setIsExpanded] = useState(false);

    if (rows.length === 0) {
      return null;
    }

    const displayCount = count ?? rows.length;
    const hiddenCount = rows.length - collapsedCount;
    const isCollapsible = hiddenCount > 0;
    const visibleRows = isCollapsible && !isExpanded ? rows.slice(0, collapsedCount) : rows;

    return (
      <div
        css={css({
          border: euiTheme.border.thin,
          borderRadius: euiTheme.border.radius.medium,
          overflow: 'hidden',
        })}
        data-test-subj="attachmentGroupList"
      >
        <div
          css={css({
            padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
            backgroundColor: euiTheme.colors.lightestShade,
          })}
          data-test-subj="attachmentGroupListHeader"
        >
          <div css={css({ display: 'flex', alignItems: 'center', gap: euiTheme.size.s })}>
            <EuiText size="xs">
              <strong>{title}</strong>
            </EuiText>
            <EuiBadge color="hollow">{displayCount}</EuiBadge>
          </div>
        </div>

        <EuiFlexGroup
          component="ul"
          id={listId}
          direction="column"
          gutterSize="none"
          responsive={false}
          css={css({
            margin: 0,
            padding: 0,
            listStyle: 'none',
            borderTop: euiTheme.border.thin,
            '& > li + li': { borderTop: euiTheme.border.thin },
          })}
        >
          {visibleRows.map((row, index) => (
            <React.Fragment key={index}>{row}</React.Fragment>
          ))}
        </EuiFlexGroup>

        {isCollapsible && (
          <div
            css={css({
              padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
              borderTop: euiTheme.border.thin,
            })}
          >
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType={isExpanded ? 'chevronSingleUp' : 'chevronSingleDown'}
              iconSide="left"
              aria-expanded={isExpanded}
              aria-controls={listId}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              data-test-subj="attachmentGroupListToggle"
            >
              {isExpanded ? ATTACHMENT_GROUP_SHOW_LESS : attachmentGroupShowMore(hiddenCount)}
            </EuiButtonEmpty>
          </div>
        )}
      </div>
    );
  }
);

AttachmentGroupList.displayName = 'AttachmentGroupList';
