/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import type { KiListSummary } from '../../../hooks/use_list_ki';
import {
  ALL_TYPE_FILTER,
  getListKiTypeFilterLabel,
  type ListKiTypeFilter as ListKiTypeFilterValue,
} from './list_ki_helpers';
import { ListKiFilterButton, type ListKiFilterOption } from './list_ki_filter_button';

const TYPE_FILTER_MIN_WIDTH = '16rem';
/** Fits label + chevron + active-filter badge so the control does not grow when a type is selected. */
const TYPE_FILTER_BUTTON_MIN_WIDTH = '7.75rem';

interface ListKiTypeFilterProps {
  typeFilter: ListKiTypeFilterValue;
  summary: KiListSummary;
  onTypeFilterChange: (filter: ListKiTypeFilterValue) => void;
}

export const ListKiTypeFilter = ({
  typeFilter,
  summary,
  onTypeFilterChange,
}: ListKiTypeFilterProps) => {
  const buttonLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.typeFilterLabel', {
    defaultMessage: 'Type',
  });

  const typeFilterLegend = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.listKi.typeFilterLegend',
    { defaultMessage: 'Filter Knowledge Indicators by type' }
  );

  const options = useMemo((): Array<ListKiFilterOption<string>> => {
    const ebtProps = getEbtProps({
      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
      action: CONTEXT_ENGINE_UI_EBT.action.listKi.FILTER_TYPE,
    });

    return [{ type: ALL_TYPE_FILTER.value, count: summary.total }, ...summary.countsByType].map(
      ({ type, count }) => ({
        value: type,
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.filterType', {
          defaultMessage: '{typeLabel} ({count})',
          values: { typeLabel: getListKiTypeFilterLabel(type), count },
        }),
        checked: type === typeFilter.value ? 'on' : undefined,
        'data-test-subj': `contextListKiFilter-${type}`,
        ...ebtProps,
      })
    );
  }, [summary.total, summary.countsByType, typeFilter.value]);

  const handleTypeChange = (value: string) => {
    onTypeFilterChange(value === ALL_TYPE_FILTER.value ? ALL_TYPE_FILTER : { kind: 'type', value });
  };

  return (
    <ListKiFilterButton
      buttonLabel={buttonLabel}
      legend={typeFilterLegend}
      panelMinWidth={TYPE_FILTER_MIN_WIDTH}
      buttonMinWidth={TYPE_FILTER_BUTTON_MIN_WIDTH}
      options={options}
      hasActiveFilters={typeFilter.kind === 'type'}
      numActiveFilters={typeFilter.kind === 'type' ? 1 : 0}
      onChange={handleTypeChange}
      buttonTestSubj="contextListKiTypeFilters"
    />
  );
};
