/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPopover, EuiFilterButton, EuiHealth, useEuiTheme } from '@elastic/eui';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { alertTimelineStatusColor } from '../../alert_timeline/alert_timeline_status_palette';
import { InlineFilterPopover } from './inline_filter_popover';
import * as i18n from './translations';

// The dot uses a resolved theme color so it keeps its color when its row is
// highlighted/selected: `EuiIcon` applies custom color values inline, which
// beats `EuiSelectable`'s highlighted-row recolor. Colors match the Lifecycle lane.
const EPISODE_STATUS_OPTIONS: Array<{
  label: string;
  value: AlertEpisodeStatus;
}> = [
  { label: i18n.STATUS_FILTER_ACTIVE_LABEL, value: ALERT_EPISODE_STATUS.ACTIVE },
  { label: i18n.STATUS_FILTER_RECOVERING_LABEL, value: ALERT_EPISODE_STATUS.RECOVERING },
  { label: i18n.STATUS_FILTER_PENDING_LABEL, value: ALERT_EPISODE_STATUS.PENDING },
  { label: i18n.STATUS_FILTER_INACTIVE_LABEL, value: ALERT_EPISODE_STATUS.INACTIVE },
];

interface AlertEpisodesStatusFilterProps {
  selectedStatuses?: string[] | null;
  onStatusesChange: (statuses: string[] | undefined) => void;
  'data-test-subj'?: string;
}

export function AlertEpisodesStatusFilter({
  selectedStatuses,
  onStatusesChange,
  'data-test-subj': dataTestSubj = 'statusFilter',
}: AlertEpisodesStatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const options = useMemo(
    () =>
      EPISODE_STATUS_OPTIONS.map(({ label, value }) => ({
        label,
        value,
        prepend: <EuiHealth color={alertTimelineStatusColor(euiTheme, value)} />,
      })),
    [euiTheme]
  );

  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onStatusesChange(values.length > 0 ? values : undefined);
    },
    [onStatusesChange]
  );

  const selectedValues = selectedStatuses ?? [];
  const activeCount = selectedValues.length;

  return (
    <EuiPopover
      aria-label={i18n.STATUS_FILTER_ARIA_LABEL}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numFilters={options.length}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          data-test-subj={`${dataTestSubj}-button`}
        >
          {i18n.STATUS_FILTER_LABEL}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      <InlineFilterPopover
        options={options}
        selectedValues={selectedValues}
        singleSelect={false}
        onSelectionChange={handleSelectionChange}
        emptyMessage={i18n.STATUS_FILTER_NO_MATCH}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
