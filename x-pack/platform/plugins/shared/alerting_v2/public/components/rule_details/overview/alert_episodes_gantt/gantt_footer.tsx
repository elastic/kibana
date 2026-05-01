/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GanttSortPolicy } from '../../../../utils/derive_gantt_data';

export interface GanttFooterProps {
  sort: GanttSortPolicy;
  onSortChange: (sort: GanttSortPolicy) => void;
  visibleRowCount: number;
  totalRowCount: number;
  viewAllHref: string;
}

const SORT_OPTIONS: Array<{ value: GanttSortPolicy; text: string }> = [
  {
    value: 'started_asc',
    text: i18n.translate('xpack.alertingV2.ruleDetails.gantt.sortStartedAsc', {
      defaultMessage: 'Started (oldest first)',
    }),
  },
  {
    value: 'started_desc',
    text: i18n.translate('xpack.alertingV2.ruleDetails.gantt.sortStartedDesc', {
      defaultMessage: 'Started (newest first)',
    }),
  },
  {
    value: 'longest_open',
    text: i18n.translate('xpack.alertingV2.ruleDetails.gantt.sortLongestOpen', {
      defaultMessage: 'Longest open',
    }),
  },
  {
    value: 'recently_active',
    text: i18n.translate('xpack.alertingV2.ruleDetails.gantt.sortRecentlyActive', {
      defaultMessage: 'Recently active',
    }),
  },
];

export const GanttFooter: React.FC<GanttFooterProps> = ({
  sort,
  onSortChange,
  visibleRowCount,
  totalRowCount,
  viewAllHref,
}) => (
  <EuiFlexGroup
    justifyContent="spaceBetween"
    alignItems="center"
    gutterSize="m"
    responsive={false}
    data-test-subj="ganttFooter"
  >
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2.ruleDetails.gantt.sortLabel', {
              defaultMessage: 'Sort:',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            options={SORT_OPTIONS}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as GanttSortPolicy)}
            aria-label={i18n.translate('xpack.alertingV2.ruleDetails.gantt.sortAriaLabel', {
              defaultMessage: 'Sort series',
            })}
            data-test-subj="ganttSortSelect"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2.ruleDetails.gantt.showingCount', {
              defaultMessage: 'Showing {visible} of {total}',
              values: { visible: visibleRowCount, total: totalRowCount },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    {totalRowCount > visibleRowCount && (
      <EuiFlexItem grow={false}>
        <EuiLink href={viewAllHref} data-test-subj="ganttViewAllEpisodes">
          {i18n.translate('xpack.alertingV2.ruleDetails.gantt.viewAllEpisodes', {
            defaultMessage: 'View all {total} episodes →',
            values: { total: totalRowCount },
          })}
        </EuiLink>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
