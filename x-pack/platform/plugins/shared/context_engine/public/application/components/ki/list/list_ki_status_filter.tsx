/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect, type EuiSelectOption } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { getListKiStatusFilterLabel, type ListKiStatusFilterValue } from './list_ki_helpers';

const STATUS_FILTER_OPTIONS: ListKiStatusFilterValue[] = [
  'active',
  'expired',
  'deleted',
  'verification_failed',
  'all',
];

const isStatusFilterValue = (value: string): value is ListKiStatusFilterValue =>
  STATUS_FILTER_OPTIONS.some((option) => option === value);

interface ListKiStatusFilterProps {
  statusFilter: ListKiStatusFilterValue;
  onStatusFilterChange: (status: ListKiStatusFilterValue) => void;
}

export const ListKiStatusFilter = ({
  statusFilter,
  onStatusFilterChange,
}: ListKiStatusFilterProps) => {
  const options = useMemo(
    (): EuiSelectOption[] =>
      STATUS_FILTER_OPTIONS.map((value) => ({
        value,
        text: getListKiStatusFilterLabel(value),
      })),
    []
  );

  const handleChange = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLSelectElement>) => {
      if (!isStatusFilterValue(value)) {
        return;
      }
      onStatusFilterChange(value);
    },
    [onStatusFilterChange]
  );

  return (
    <EuiSelect
      options={options}
      value={statusFilter}
      onChange={handleChange}
      aria-label={i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.statusFilterLegend', {
        defaultMessage: 'Filter Knowledge documents by status',
      })}
      data-test-subj="contextListKiStatusFilter"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.listKi.FILTER_STATUS,
      })}
    />
  );
};
