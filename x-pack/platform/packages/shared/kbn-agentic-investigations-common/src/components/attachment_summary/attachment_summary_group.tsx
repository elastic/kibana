/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ATTACHMENT_SUMMARY_SHOW_LESS, attachmentSummaryShowMore } from './translations';

export const DEFAULT_COLLAPSED_COUNT = 4;

export interface AttachmentSummaryGroupProps {
  /** The uppercase section header, e.g. "ALERTS". */
  title: string;
  /** The rows to display. Provided by the attachment's renderConversationDetailsContent. */
  rows: React.ReactNode[];
  /**
   * Override the count shown next to the title.
   * Defaults to `rows.length` when absent.
   */
  count?: number;
  /**
   * Number of rows visible before "Show more". Defaults to DEFAULT_COLLAPSED_COUNT (4).
   * Set to Infinity or a number >= rows.length to disable collapsing.
   */
  collapsedCount?: number;
}

/** One titled section inside the attachment summary panel. Owns its own Show more/less toggle. */
export const AttachmentSummaryGroup = memo<AttachmentSummaryGroupProps>(
  ({ title, rows, count, collapsedCount = DEFAULT_COLLAPSED_COUNT }) => {
    const { euiTheme } = useEuiTheme();
    const listId = useGeneratedHtmlId({ prefix: 'attachmentSummaryGroup' });
    const [isExpanded, setIsExpanded] = useState(false);

    if (rows.length === 0) {
      return null;
    }

    const displayCount = count ?? rows.length;
    const hiddenCount = rows.length - collapsedCount;
    const isCollapsible = hiddenCount > 0;
    const visibleRows = isCollapsible && !isExpanded ? rows.slice(0, collapsedCount) : rows;

    return (
      <div data-test-subj="attachmentSummaryGroup">
        <div
          css={css({
            padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
            borderBottom: euiTheme.border.thin,
          })}
          data-test-subj="attachmentSummaryGroupHeader"
        >
          <div css={css({ display: 'flex', alignItems: 'baseline', gap: '8px' })}>
            {[title, displayCount].map((part, i) => (
              <EuiText
                key={i}
                size="xs"
                css={css({
                  fontWeight: euiTheme.font.weight.semiBold,
                  textTransform: 'uppercase',
                  color: euiTheme.colors.textSubdued,
                  letterSpacing: '0.05em',
                })}
              >
                {part}
              </EuiText>
            ))}
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
              aria-expanded={isExpanded}
              aria-controls={listId}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              data-test-subj="attachmentSummaryGroupToggle"
            >
              {isExpanded ? ATTACHMENT_SUMMARY_SHOW_LESS : attachmentSummaryShowMore(hiddenCount)}
            </EuiButtonEmpty>
          </div>
        )}
      </div>
    );
  }
);

AttachmentSummaryGroup.displayName = 'AttachmentSummaryGroup';
