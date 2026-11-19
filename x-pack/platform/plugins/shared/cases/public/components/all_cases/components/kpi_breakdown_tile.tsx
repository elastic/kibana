/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiProgress,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { KpiMetricBreakdownResult, KpiMetricResult } from '../../../../common/types/api';
import type { KpiMetricDirection } from '../../../../common/types/domain';
import { CaseSeverity, CaseStatuses } from '../../../../common/types/domain';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { severities } from '../../severity/config';
import { statuses } from '../../status/config';
import { getName } from '../../user_profiles/display_name';
import { KPI_BREAKDOWN_EMPTY, KPI_BREAKDOWN_NO_VALUE, KPI_BREAKDOWN_OTHER } from '../translations';
import {
  KpiMetricTileDescription,
  formatKpiChangePercent,
  formatKpiMetricValue,
  getKpiChangeColor,
  getKpiChangePercent,
} from './kpi_metric_tile';

const EMPTY_VALUE = '-';
const ASSIGNEE_UID_FIELD = 'case.assignees.uid';

interface OrderedLabel {
  key: string;
  label: string;
}

const SEVERITY_LABELS: readonly OrderedLabel[] = [
  CaseSeverity.CRITICAL,
  CaseSeverity.HIGH,
  CaseSeverity.MEDIUM,
  CaseSeverity.LOW,
].map((severity) => ({ key: severity, label: severities[severity].label }));

const STATUS_LABELS: readonly OrderedLabel[] = [
  CaseStatuses.open,
  CaseStatuses['in-progress'],
  CaseStatuses.closed,
].map((status) => ({ key: status, label: statuses[status].label }));

const ORDERED_LABELS: Record<string, readonly OrderedLabel[]> = {
  'case.severity': SEVERITY_LABELS,
  'action.severity_new': SEVERITY_LABELS,
  'case.status': STATUS_LABELS,
  'action.status_new': STATUS_LABELS,
};

export interface KpiBreakdownRow {
  id: string;
  label: string;
  count: number;
  previousCount?: number | null;
}

type KpiBreakdownValues = Pick<
  KpiMetricBreakdownResult,
  'field' | 'buckets' | 'otherCount' | 'missingCount'
>;

/**
 * Returns the rows of a breakdown with their labels, in the order of the field.
 * The "Other" and the "No value" rows come last and only when their count is more than 0.
 */
export const getKpiBreakdownRows = (
  { field, buckets, otherCount, missingCount }: KpiBreakdownValues,
  userProfiles?: Map<string, UserProfileWithAvatar>
): KpiBreakdownRow[] => {
  const orderedLabels = ORDERED_LABELS[field];

  const getLabel = (key: string): string => {
    if (orderedLabels != null) {
      return orderedLabels.find((entry) => entry.key === key)?.label ?? key;
    }

    const profile = field === ASSIGNEE_UID_FIELD ? userProfiles?.get(key) : undefined;

    return profile != null ? getName(profile.user) : key;
  };

  const getRank = (key: string): number => {
    const rank = orderedLabels?.findIndex((entry) => entry.key === key) ?? -1;
    return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
  };

  const orderedBuckets =
    orderedLabels != null ? [...buckets].sort((a, b) => getRank(a.key) - getRank(b.key)) : buckets;

  return [
    ...orderedBuckets.map(({ key, count, previousCount }) => ({
      id: `value-${key}`,
      label: getLabel(key),
      count,
      previousCount,
    })),
    ...(otherCount > 0 ? [{ id: 'other', label: KPI_BREAKDOWN_OTHER, count: otherCount }] : []),
    ...(missingCount > 0
      ? [{ id: 'missing', label: KPI_BREAKDOWN_NO_VALUE, count: missingCount }]
      : []),
  ];
};

/**
 * Formats the rows of a breakdown as one line, for example "Critical 12, High 10".
 */
export const getKpiBreakdownUserIds = (result?: KpiMetricResult): string[] =>
  result?.type === 'breakdown' && result.field === ASSIGNEE_UID_FIELD
    ? result.buckets.map(({ key }) => key)
    : [];

export const formatKpiBreakdownSummary = (rows: KpiBreakdownRow[]): string =>
  rows.map(({ label, count }) => `${label} ${formatKpiMetricValue(count, 'number')}`).join(', ');

export interface KpiBreakdownTileProps {
  label: string;
  result?: KpiMetricBreakdownResult;
  direction?: KpiMetricDirection;
  isLoading: boolean;
  /**
   * When set, the tile shows the empty state and the message in a tooltip.
   */
  errorMessage?: string;
  /**
   * When set, the tile shows an info icon next to the label with this text in a tooltip.
   */
  dateHint?: string;
  dataTestSubj: string;
}

const KpiBreakdownRowItem: React.FC<{
  row: KpiBreakdownRow;
  total: number;
  direction?: KpiMetricDirection;
  dataTestSubj: string;
}> = ({ row, total, direction, dataTestSubj }) => {
  const { id, label, count, previousCount } = row;
  const changePercent = getKpiChangePercent(count, previousCount);

  return (
    <EuiProgress
      value={count}
      max={total}
      size="s"
      label={label}
      valueText={
        <>
          {formatKpiMetricValue(count, 'number')}
          {changePercent != null && (
            <>
              {' '}
              <EuiText
                component="span"
                size="xs"
                color={getKpiChangeColor(changePercent, direction)}
                data-test-subj={`${dataTestSubj}-row-${id}-change`}
              >
                {formatKpiChangePercent(changePercent)}
              </EuiText>
            </>
          )}
        </>
      }
      data-test-subj={`${dataTestSubj}-row-${id}`}
    />
  );
};
KpiBreakdownRowItem.displayName = 'KpiBreakdownRowItem';

const KpiBreakdownTileComponent: React.FC<KpiBreakdownTileProps> = ({
  label,
  result,
  direction,
  isLoading,
  errorMessage,
  dateHint,
  dataTestSubj,
}) => {
  const uids = useMemo(() => getKpiBreakdownUserIds(result), [result]);
  const { data: userProfiles } = useBulkGetUserProfiles({ uids });
  const rows = useMemo(
    () => (result != null ? getKpiBreakdownRows(result, userProfiles) : []),
    [result, userProfiles]
  );

  const hasError = errorMessage != null;
  const description =
    hasError || dateHint != null ? (
      <KpiMetricTileDescription
        label={label}
        errorMessage={errorMessage}
        dateHint={dateHint}
        dataTestSubj={dataTestSubj}
      />
    ) : (
      label
    );

  let title: React.ReactNode =
    hasError || result == null ? EMPTY_VALUE : formatKpiMetricValue(result.total, 'number');

  if (isLoading) {
    title = <EuiLoadingSpinner data-test-subj={`${dataTestSubj}-loading-spinner`} />;
  }

  const total = !hasError && !isLoading ? result?.total : undefined;

  return (
    <EuiStat
      data-test-subj={dataTestSubj}
      description={description}
      title={title}
      titleColor={hasError ? 'subdued' : undefined}
      titleSize="xs"
      text-align="left"
    >
      {total === 0 && (
        <EuiText size="xs" color="subdued" data-test-subj={`${dataTestSubj}-empty`}>
          {KPI_BREAKDOWN_EMPTY}
        </EuiText>
      )}
      {total != null && total > 0 && (
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          {rows.map((row) => (
            <EuiFlexItem key={row.id}>
              <KpiBreakdownRowItem
                row={row}
                total={total}
                direction={direction}
                dataTestSubj={dataTestSubj}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiStat>
  );
};
KpiBreakdownTileComponent.displayName = 'KpiBreakdownTile';

export const KpiBreakdownTile = React.memo(KpiBreakdownTileComponent);
