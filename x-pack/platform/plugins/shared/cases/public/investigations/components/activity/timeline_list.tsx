/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { TabProps } from '../tabs/tab_props';
import type { DayGroup } from './activity_helpers';
import { ResponseEntryRow, SecurityEventRow } from './timeline_row';
import * as i18n from './translations';

export interface TimelineListProps {
  days: readonly DayGroup[];
  offsetOrigin: number | undefined;
  highlightedId: string | null;
  freshIds: ReadonlySet<string>;
  onNavigateTab: TabProps['onNavigateTab'];
}

/** Rows of both lanes under a heading per day (UTC). */
export const TimelineList: React.FC<TimelineListProps> = ({
  days,
  offsetOrigin,
  highlightedId,
  freshIds,
  onNavigateTab,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div data-test-subj="investigationTimeline">
      {days.map((day) => (
        <section key={day.key} data-test-subj={`investigationTimelineDay-${day.key}`}>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            css={css`
              margin-block: ${euiTheme.size.s};
              padding-block-end: ${euiTheme.size.xs};
              border-block-end: ${euiTheme.border.thin};
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{day.label}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{i18n.DAY_ENTRIES(day.rows.length)}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          {day.rows.map((row) => {
            const isHighlighted = highlightedId === row.id || freshIds.has(row.id);
            return row.lane === 'security' ? (
              <SecurityEventRow
                key={row.id}
                item={row.item}
                ts={row.ts}
                offsetOrigin={offsetOrigin}
                isHighlighted={isHighlighted}
                onNavigateTab={onNavigateTab}
              />
            ) : (
              <ResponseEntryRow
                key={row.id}
                entry={row.entry}
                ts={row.ts}
                offsetOrigin={offsetOrigin}
                isHighlighted={isHighlighted}
                onNavigateTab={onNavigateTab}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
};
TimelineList.displayName = 'TimelineList';
