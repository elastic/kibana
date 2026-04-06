/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiPopover, EuiFilterButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InlineFilterPopover } from './inline_filter_popover';

const EPISODE_STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  {
    label: i18n.translate('xpack.alertingV2EpisodesUi.statusFilter.activeLabel', {
      defaultMessage: 'Active',
    }),
    value: 'active',
  },
  {
    label: i18n.translate('xpack.alertingV2EpisodesUi.statusFilter.recoveringLabel', {
      defaultMessage: 'Recovering',
    }),
    value: 'recovering',
  },
  {
    label: i18n.translate('xpack.alertingV2EpisodesUi.statusFilter.pendingLabel', {
      defaultMessage: 'Pending',
    }),
    value: 'pending',
  },
  {
    label: i18n.translate('xpack.alertingV2EpisodesUi.statusFilter.inactiveLabel', {
      defaultMessage: 'Inactive',
    }),
    value: 'inactive',
  },
];

interface StatusFilterProps {
  selectedStatus?: string | null;
  onStatusChange: (status: string | undefined) => void;
  'data-test-subj'?: string;
}

export function StatusFilter({
  selectedStatus,
  onStatusChange,
  'data-test-subj': dataTestSubj = 'statusFilter',
}: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onStatusChange(values.length > 0 ? values[0] : undefined);
    },
    [onStatusChange]
  );

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.alertingV2EpisodesUi.statusFilter.ariaLabel', {
        defaultMessage: 'Status filter',
      })}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={!!selectedStatus}
          numFilters={EPISODE_STATUS_OPTIONS.length}
          numActiveFilters={selectedStatus ? 1 : undefined}
          data-test-subj={`${dataTestSubj}-button`}
        >
          {i18n.translate('xpack.alertingV2EpisodesUi.statusFilter.label', {
            defaultMessage: 'Status',
          })}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      <InlineFilterPopover
        options={EPISODE_STATUS_OPTIONS}
        selectedValues={selectedStatus ? [selectedStatus] : []}
        singleSelect
        onSelectionChange={handleSelectionChange}
        emptyMessage={i18n.translate('xpack.alertingV2EpisodesUi.statusFilter.noMatch', {
          defaultMessage: 'No matching statuses',
        })}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
