/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { KiLifecycleStatus } from '../../../../../common/step_types/ki';
import { getListKiStatusFilterLabel } from './list_ki_helpers';

const STATUS_FILTER_MIN_WIDTH = '12rem';
const STATUS_FILTER_BUTTON_MIN_WIDTH = '7.25rem';

const LIST_KI_STATUS_FILTER_OPTIONS: KiLifecycleStatus[] = ['active', 'deleted'];

type SelectableStatusOption = EuiSelectableOption & { value: KiLifecycleStatus };

interface ListKiStatusFilterProps {
  statusFilter: KiLifecycleStatus;
  onStatusFilterChange: (status: KiLifecycleStatus) => void;
}

export const ListKiStatusFilter = ({
  statusFilter,
  onStatusFilterChange,
}: ListKiStatusFilterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const buttonLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.statusFilterLabel', {
    defaultMessage: 'Status',
  });

  const statusFilterLegend = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.listKi.statusFilterLegend',
    { defaultMessage: 'Filter Knowledge Indicators by lifecycle status' }
  );

  const options = useMemo(
    (): SelectableStatusOption[] =>
      LIST_KI_STATUS_FILTER_OPTIONS.map((value) => ({
        value,
        label: getListKiStatusFilterLabel(value),
        checked: value === statusFilter ? 'on' : undefined,
        'data-test-subj': `contextListKiStatusFilter-${value}`,
      })),
    [statusFilter]
  );

  const handleChange = (updatedOptions: SelectableStatusOption[]) => {
    const selected = updatedOptions.find(({ checked }) => checked === 'on');
    if (!selected) {
      return;
    }
    onStatusFilterChange(selected.value);
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiFilterButton
      iconType="chevronSingleDown"
      isSelected={isPopoverOpen}
      hasActiveFilters
      numActiveFilters={1}
      css={css({ minWidth: STATUS_FILTER_BUTTON_MIN_WIDTH })}
      onClick={() => setIsPopoverOpen((open) => !open)}
      data-test-subj="contextListKiStatusFilters"
    >
      {buttonLabel}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={statusFilterLegend}
    >
      <div style={{ minWidth: STATUS_FILTER_MIN_WIDTH }}>
        <EuiSelectable<SelectableStatusOption>
          singleSelection="always"
          aria-label={statusFilterLegend}
          options={options}
          onChange={handleChange}
          listProps={{ paddingSize: 's' }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
};
