/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import { CaseStatuses } from '../../../../common/types/domain';
import { findStatusByKey } from '../../../../common/utils/statuses';
import { useCaseStatuses } from '../../status/use_case_statuses';

import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter } from './multi_select_filter';
import * as i18n from '../translations';

interface Props {
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  hiddenStatuses?: CaseStatuses[];
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
  /** Selected categories; applied when custom statuses are off */
  selectedOptionKeys: string[];
  /** Selected status keys; applied when custom statuses are on */
  selectedStatusKeys?: string[];
}

const caseStatuses = [
  { key: CaseStatuses.open, label: i18n.STATUS_OPEN },
  { key: CaseStatuses['in-progress'], label: i18n.STATUS_IN_PROGRESS },
  { key: CaseStatuses.closed, label: i18n.STATUS_CLOSED },
];

type StatusOption = MultiSelectFilterOption<string, string>;

export const StatusFilterComponent = ({
  countClosedCases,
  countInProgressCases,
  countOpenCases,
  hiddenStatuses = [],
  onChange,
  selectedOptionKeys,
  selectedStatusKeys = [],
}: Props) => {
  const { enabledStatuses, isCustomStatusesEnabled, isLoading } = useCaseStatuses();
  const stats = useMemo(
    () => ({
      [CaseStatuses.open]: countOpenCases ?? 0,
      [CaseStatuses['in-progress']]: countInProgressCases ?? 0,
      [CaseStatuses.closed]: countClosedCases ?? 0,
    }),
    [countClosedCases, countInProgressCases, countOpenCases]
  );
  const options = useMemo((): StatusOption[] => {
    const categories = caseStatuses.filter((status) => !hiddenStatuses.includes(status.key));

    if (!isCustomStatusesEnabled) {
      return categories;
    }

    // Counts are per category, so custom statuses group under a category heading that carries it.
    return categories.flatMap(({ key: category, label }) => [
      // Built-in default keys equal their category, so the heading needs its own key.
      { key: `${category}-group`, label: `${label} (${stats[category]})`, isGroupLabel: true },
      ...enabledStatuses
        .filter((status) => status.category === category)
        .map((status) => ({ key: status.key, label: status.label })),
    ]);
  }, [enabledStatuses, hiddenStatuses, isCustomStatusesEnabled, stats]);

  const onFilterChange = useCallback(
    ({ selectedOptionKeys: keys }: { filterId: string; selectedOptionKeys: string[] }) =>
      onChange({
        filterId: isCustomStatusesEnabled ? 'statusKey' : 'status',
        selectedOptionKeys: keys,
      }),
    [isCustomStatusesEnabled, onChange]
  );

  const renderOption = (option: StatusOption) => {
    const status = isCustomStatusesEnabled
      ? findStatusByKey(enabledStatuses, option.key)
      : undefined;
    const category = status?.category ?? (option.key as CaseStatuses);
    return (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={1}>
          <span>
            <Status status={category} label={status?.label} />
          </span>
        </EuiFlexItem>
        {!isCustomStatusesEnabled && (
          <EuiFlexItem grow={false}>{` (${stats[category]})`}</EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };
  return (
    <MultiSelectFilter
      buttonLabel={i18n.STATUS}
      id={'status'}
      onChange={onFilterChange}
      options={options}
      renderOption={renderOption}
      selectedOptionKeys={isCustomStatusesEnabled ? selectedStatusKeys : selectedOptionKeys}
      isLoading={isCustomStatusesEnabled && isLoading}
    />
  );
};

StatusFilterComponent.displayName = 'StatusFilterComponent';

export const StatusFilter = React.memo(StatusFilterComponent);
