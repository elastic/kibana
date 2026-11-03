/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import { CaseStatuses } from '../../../../common/types/domain';
import { CATEGORY_TO_STATUS, findStatus } from '../../../../common/utils/statuses';
import { getStatusBadgeProps, useCaseStatuses } from '../../status/use_case_statuses';

import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter } from './multi_select_filter';
import * as i18n from '../translations';

interface Props {
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  hiddenStatuses?: CaseStatuses[];
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
  /** Selected status categories; used when custom statuses are off. */
  selectedOptionKeys: string[];
  /** Selected status keys; used when custom statuses are on. */
  selectedStatusKeys?: string[];
}

const caseStatuses = [
  { key: CaseStatuses.open, label: i18n.STATUS_OPEN },
  { key: CaseStatuses['in-progress'], label: i18n.STATUS_IN_PROGRESS },
  { key: CaseStatuses.closed, label: i18n.STATUS_CLOSED },
];

const isCaseStatus = (key: string): key is CaseStatuses =>
  (Object.values(CaseStatuses) as string[]).includes(key);

export const StatusFilterComponent = ({
  countClosedCases,
  countInProgressCases,
  countOpenCases,
  hiddenStatuses = [],
  onChange,
  selectedOptionKeys,
  selectedStatusKeys = [],
}: Props) => {
  const { statuses, isCustomStatusesEnabled, isLoading } = useCaseStatuses();
  const stats = useMemo(
    () => ({
      [CaseStatuses.open]: countOpenCases ?? 0,
      [CaseStatuses['in-progress']]: countInProgressCases ?? 0,
      [CaseStatuses.closed]: countClosedCases ?? 0,
    }),
    [countClosedCases, countInProgressCases, countOpenCases]
  );

  const options = useMemo((): Array<MultiSelectFilterOption<string, string>> => {
    if (!isCustomStatusesEnabled) {
      return caseStatuses.filter((status) => !hiddenStatuses.includes(status.key));
    }

    // Statuses are listed flat in admin order. Counts are per category, so they are left out.
    return statuses
      .filter((status) => !hiddenStatuses.includes(CATEGORY_TO_STATUS[status.category]))
      .map(({ key, label }) => ({ key, label }));
  }, [hiddenStatuses, isCustomStatusesEnabled, statuses]);

  const onFilterChange = useCallback(
    ({ selectedOptionKeys: keys }: { filterId: string; selectedOptionKeys: string[] }) =>
      onChange({
        filterId: isCustomStatusesEnabled ? 'statusKey' : 'status',
        selectedOptionKeys: keys,
      }),
    [isCustomStatusesEnabled, onChange]
  );

  const renderOption = (option: MultiSelectFilterOption<string, string>) => {
    const status = isCustomStatusesEnabled ? findStatus(statuses, option.key) : undefined;

    if (status != null) {
      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <span>
              <Status {...getStatusBadgeProps(status)} />
            </span>
          </EuiFlexItem>
          {status.disabled && (
            <EuiFlexItem grow={false}>
              <EuiTextColor color="subdued">{i18n.STATUS_DISABLED}</EuiTextColor>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }

    if (!isCaseStatus(option.key)) {
      return option.label;
    }

    return (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={1}>
          <span>
            <Status status={option.key} />
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{` (${stats[option.key]})`}</EuiFlexItem>
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
      isLoading={isLoading}
    />
  );
};

StatusFilterComponent.displayName = 'StatusFilterComponent';

export const StatusFilter = React.memo(StatusFilterComponent);
