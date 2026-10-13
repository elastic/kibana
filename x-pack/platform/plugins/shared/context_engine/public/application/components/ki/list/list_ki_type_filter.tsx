/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import type { KiListSummary } from '../../../hooks/use_list_ki';
import {
  ALL_TYPE_FILTER,
  getListKiTypeFilterLabel,
  type ListKiTypeFilter as ListKiTypeFilterValue,
} from './list_ki_helpers';

const TYPE_FILTER_MIN_WIDTH = '16rem';
/** Fits label + chevron + active-filter badge so the control does not grow when a type is selected. */
const TYPE_FILTER_BUTTON_MIN_WIDTH = '7.75rem';

type SelectableTypeOption = EuiSelectableOption & { value: string };

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const buttonLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.typeFilterLabel', {
    defaultMessage: 'Type',
  });

  const typeFilterLegend = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.listKi.typeFilterLegend',
    { defaultMessage: 'Filter Knowledge Indicators by type' }
  );

  const options = useMemo((): SelectableTypeOption[] => {
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

  const handleChange = (updatedOptions: SelectableTypeOption[]) => {
    const selected = updatedOptions.find(({ checked }) => checked === 'on');
    if (!selected) {
      return;
    }
    onTypeFilterChange(
      selected.value === ALL_TYPE_FILTER.value
        ? ALL_TYPE_FILTER
        : { kind: 'type', value: selected.value }
    );
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiFilterButton
      iconType="chevronSingleDown"
      isSelected={isPopoverOpen}
      hasActiveFilters={typeFilter.kind === 'type'}
      numActiveFilters={typeFilter.kind === 'type' ? 1 : 0}
      css={css({ minWidth: TYPE_FILTER_BUTTON_MIN_WIDTH })}
      onClick={() => setIsPopoverOpen((open) => !open)}
      data-test-subj="contextListKiTypeFilters"
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
      aria-label={typeFilterLegend}
    >
      <div style={{ minWidth: TYPE_FILTER_MIN_WIDTH }}>
        <EuiSelectable<SelectableTypeOption>
          singleSelection="always"
          aria-label={typeFilterLegend}
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
