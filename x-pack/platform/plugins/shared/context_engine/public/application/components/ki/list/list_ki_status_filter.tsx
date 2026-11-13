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
import type { KiLifecycleStatus } from '../../../../../common/step_types/ki';
import { getListKiStatusFilterLabel } from './list_ki_helpers';
import { ListKiFilterButton, type ListKiFilterOption } from './list_ki_filter_button';

const STATUS_FILTER_MIN_WIDTH = '12rem';
const STATUS_FILTER_BUTTON_MIN_WIDTH = '7.25rem';

const LIST_KI_STATUS_FILTER_OPTIONS: KiLifecycleStatus[] = [
  'active',
  'deleted',
  'verification_failed',
];

interface ListKiStatusFilterProps {
  statusFilter: KiLifecycleStatus;
  onStatusFilterChange: (status: KiLifecycleStatus) => void;
}

export const ListKiStatusFilter = ({
  statusFilter,
  onStatusFilterChange,
}: ListKiStatusFilterProps) => {
  const buttonLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.statusFilterLabel', {
    defaultMessage: 'Status',
  });

  const statusFilterLegend = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.listKi.statusFilterLegend',
    { defaultMessage: 'Filter Knowledge Indicators by lifecycle status' }
  );

  const options = useMemo((): Array<ListKiFilterOption<KiLifecycleStatus>> => {
    const ebtProps = getEbtProps({
      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
      action: CONTEXT_ENGINE_UI_EBT.action.listKi.FILTER_STATUS,
    });

    return LIST_KI_STATUS_FILTER_OPTIONS.map((value) => ({
      value,
      label: getListKiStatusFilterLabel(value),
      checked: value === statusFilter ? 'on' : undefined,
      'data-test-subj': `contextListKiStatusFilter-${value}`,
      ...ebtProps,
    }));
  }, [statusFilter]);

  return (
    <ListKiFilterButton
      buttonLabel={buttonLabel}
      legend={statusFilterLegend}
      panelMinWidth={STATUS_FILTER_MIN_WIDTH}
      buttonMinWidth={STATUS_FILTER_BUTTON_MIN_WIDTH}
      options={options}
      hasActiveFilters
      numActiveFilters={1}
      onChange={onStatusFilterChange}
      buttonTestSubj="contextListKiStatusFilters"
    />
  );
};
