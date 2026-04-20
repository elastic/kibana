/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiPopover, EuiFilterButton } from '@elastic/eui';
import { InlineFilterPopover } from './inline_filter_popover';
import * as i18n from './translations';

const EPISODE_STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  {
    label: i18n.STATUS_FILTER_ACTIVE_LABEL,
    value: 'active',
  },
  {
    label: i18n.STATUS_FILTER_RECOVERING_LABEL,
    value: 'recovering',
  },
  {
    label: i18n.STATUS_FILTER_PENDING_LABEL,
    value: 'pending',
  },
  {
    label: i18n.STATUS_FILTER_INACTIVE_LABEL,
    value: 'inactive',
  },
];

interface AlertEpisodesStatusFilterProps {
  selectedStatus?: string | null;
  onStatusChange: (status: string | undefined) => void;
  'data-test-subj'?: string;
}

export function AlertEpisodesStatusFilter({
  selectedStatus,
  onStatusChange,
  'data-test-subj': dataTestSubj = 'statusFilter',
}: AlertEpisodesStatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onStatusChange(values.length > 0 ? values[0] : undefined);
    },
    [onStatusChange]
  );

  return (
    <EuiPopover
      aria-label={i18n.STATUS_FILTER_ARIA_LABEL}
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
          {i18n.STATUS_FILTER_LABEL}
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
        emptyMessage={i18n.STATUS_FILTER_NO_MATCH}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
