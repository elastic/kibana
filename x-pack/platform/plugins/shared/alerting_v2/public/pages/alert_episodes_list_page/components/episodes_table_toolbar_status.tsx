/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import * as i18n from '../translations';
import {
  getEpisodesToolbarStatusKind,
  shouldShowToolbarReset,
} from '../utils/episodes_filter_utils';

export interface EpisodesTableToolbarStatusProps {
  filterState: EpisodesFilterState;
  filteredCount: number;
  /** Total alerts in range (View all / Total KPI pool). */
  viewAllCount: number;
  onClearFilters: () => void;
}

export const EpisodesTableToolbarStatus = ({
  filterState,
  filteredCount,
  viewAllCount,
  onClearFilters,
}: EpisodesTableToolbarStatusProps) => {
  const showReset = shouldShowToolbarReset(filterState);
  const statusKind = getEpisodesToolbarStatusKind(filterState);

  const statusMessage = useMemo(() => {
    const count = (
      <strong>
        <FormattedNumber value={filteredCount} />
      </strong>
    );
    const total = (
      <strong>
        <FormattedNumber value={viewAllCount} />
      </strong>
    );

    switch (statusKind) {
      case 'active_alerts':
      case 'filtered':
        return (
          <FormattedMessage
            id="xpack.alertingV2.episodes.tableToolbar.showingFiltered"
            defaultMessage="Showing {count} of {total} alerts"
            values={{ count, total }}
          />
        );
      case 'view_all':
        return (
          <FormattedMessage
            id="xpack.alertingV2.episodes.tableToolbar.viewingAll"
            defaultMessage="Viewing all {count} alerts"
            values={{ count }}
          />
        );
      case 'high_severity':
        return (
          <FormattedMessage
            id="xpack.alertingV2.episodes.tableToolbar.viewingHighSeverity"
            defaultMessage="Viewing {count} high severity alerts"
            values={{ count }}
          />
        );
      default:
        return (
          <FormattedMessage
            id="xpack.alertingV2.episodes.tableToolbar.showingFiltered"
            defaultMessage="Showing {count} of {total} alerts"
            values={{ count, total }}
          />
        );
    }
  }, [statusKind, filteredCount, viewAllCount]);

  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="episodesTableToolbar-status">
          {statusMessage}
        </EuiText>
      </EuiFlexItem>
      {showReset ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" aria-hidden>
              |
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              color="text"
              iconType="eraser"
              onClick={onClearFilters}
              data-test-subj="episodesTableToolbar-resetFilters"
            >
              {i18n.EPISODES_FILTER_BAR_RESET_FILTERS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </>
      ) : null}
    </EuiFlexGroup>
  );
};
