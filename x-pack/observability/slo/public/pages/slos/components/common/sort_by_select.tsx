/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSelectableOption, EuiText } from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { SearchState } from '../../hooks/use_url_search_state';
import type { Option } from '../slo_context_menu';
import { ContextMenuItem, SLOContextMenu } from '../slo_context_menu';
import type { SortField } from '../slo_list_search_bar';

export interface Props {
  onStateChange: (newState: Partial<SearchState>) => void;
  state: SearchState;
  loading: boolean;
}

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

export function SLOSortBy({ state, onStateChange, loading }: Props) {
  const [isSortByPopoverOpen, setIsSortByPopoverOpen] = useState(false);
  const sortBy = state.sort.by;

  const handleChangeSortBy = ({ value, label }: { value: SortField; label: string }) => {
    onStateChange({
      page: 0,
      sort: { by: value, direction: state.sort.direction },
    });
  };

  const sortByOptions: Option[] = [
    {
      label: i18n.translate('xpack.slo.list.sortBy.sliValue', {
        defaultMessage: 'SLI value',
      }),
      checked: sortBy === 'sli_value',
      value: 'sli_value',
      onClick: () => {
        handleChangeSortBy({
          value: 'sli_value',
          label: i18n.translate('xpack.slo.list.sortBy.sliValue', {
            defaultMessage: 'SLI value',
          }),
        });
      },
    },
    {
      label: i18n.translate('xpack.slo.list.sortBy.sloStatus', {
        defaultMessage: 'SLO status',
      }),
      checked: sortBy === 'status',
      value: 'status',
      onClick: () => {
        handleChangeSortBy({
          value: 'status',
          label: i18n.translate('xpack.slo.list.sortBy.sloStatus', {
            defaultMessage: 'SLO status',
          }),
        });
      },
    },
    {
      label: i18n.translate('xpack.slo.list.sortBy.errorBudgetConsumed', {
        defaultMessage: 'Error budget consumed',
      }),
      checked: sortBy === 'error_budget_consumed',
      value: 'error_budget_consumed',
      onClick: () => {
        handleChangeSortBy({
          value: 'error_budget_consumed',
          label: i18n.translate('xpack.slo.list.sortBy.errorBudgetConsumed', {
            defaultMessage: 'Error budget consumed',
          }),
        });
      },
    },
    {
      label: i18n.translate('xpack.slo.list.sortBy.errorBudgetRemaining', {
        defaultMessage: 'Error budget remaining',
      }),
      checked: sortBy === 'error_budget_remaining',
      value: 'error_budget_remaining',
      onClick: () => {
        handleChangeSortBy({
          value: 'error_budget_remaining',
          label: i18n.translate('xpack.slo.list.sortBy.errorBudgetRemaining', {
            defaultMessage: 'Error budget remaining',
          }),
        });
      },
    },
  ];

  const groupLabel = sortByOptions.find((option) => option.value === sortBy)?.label || 'Default';

  const items = [
    <EuiPanel paddingSize="s" hasShadow={false} key="group_title_panel">
      <EuiText size="xs">
        <h4>{SORT_BY_LABEL}</h4>
      </EuiText>
    </EuiPanel>,

    ...sortByOptions.map((option) => (
      <ContextMenuItem
        option={option}
        onClosePopover={() => setIsSortByPopoverOpen(false)}
        key={option.value}
      />
    )),
  ];

  return (
    <SLOContextMenu
      items={items}
      id="SortBy"
      selected={groupLabel}
      isPopoverOpen={isSortByPopoverOpen}
      setIsPopoverOpen={setIsSortByPopoverOpen}
      label={SORT_BY_LABEL}
      loading={loading}
    />
  );
}

const SORT_BY_LABEL = i18n.translate('xpack.slo.list.sortByTypeLabel', {
  defaultMessage: 'Sort by',
});
