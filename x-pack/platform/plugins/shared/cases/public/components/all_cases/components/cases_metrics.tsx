/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPanel,
  EuiStat,
  useEuiTheme,
} from '@elastic/eui';
import prettyMilliseconds from 'pretty-ms';
import { isAnalyticsPredefinedKpiMetric } from '../../../../common/constants';
import type { KpiMetricResult } from '../../../../common/types/api';
import type {
  CustomKpiMetricConfiguration,
  KpiMetricConfiguration,
} from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import { StatusStats } from '../../status/status_stats';
import { statuses } from '../../status/config';
import {
  ATTC_DESCRIPTION,
  ATTC_STAT,
  ATTC_STAT_INFO_ARIA_LABEL,
  KPI_METRIC_ANALYTICS_DISABLED,
  KPI_METRIC_CLOSED_DATE_HINT,
  KPI_METRIC_UNKNOWN,
} from '../translations';
import { PREDEFINED_LABELS } from '../../kpi_metrics/translations';
import type { KpiMetricTileProps } from './kpi_metric_tile';
import { KpiMetricTile } from './kpi_metric_tile';
import type { KpiBreakdownTileProps } from './kpi_breakdown_tile';
import { KpiBreakdownTile } from './kpi_breakdown_tile';

const PRETTY_MS_OPTIONS = { compact: true, verbose: false } as const;
const MTTR_MULTIPLIER = 1000;
const KPI_TILES_PER_ROW = 4;

export interface CasesMetricsProps {
  /**
   * Counts and MTTR from the cases search response, so the stats bar reflects the same
   * search, filters, and date range as the table (https://github.com/elastic/security-team/issues/18001).
   */
  countOpenCases: number;
  countInProgressCases: number;
  countClosedCases: number;
  mttr: number | null | undefined;
  isLoading: boolean;
  /**
   * The saved case list metrics. With no saved list, the bar shows the four default stats.
   */
  kpiMetrics?: KpiMetricConfiguration[];
  kpiResults?: KpiMetricResult[];
  isLoadingKpiResults?: boolean;
  isAnalyticsEnabled?: boolean;
}

type KpiTileValues = Omit<KpiMetricTileProps, 'threshold' | 'direction' | 'dataTestSubj'>;

const getPredefinedTileValues = (
  predefinedId: string,
  { countOpenCases, countInProgressCases, countClosedCases, mttr, isLoading }: CasesMetricsProps
): KpiTileValues => {
  switch (predefinedId) {
    case 'open_cases':
      return {
        label: statuses[CaseStatuses.open].stats.title,
        value: countOpenCases,
        format: 'number',
        isLoading,
      };
    case 'in_progress_cases':
      return {
        label: statuses[CaseStatuses['in-progress']].stats.title,
        value: countInProgressCases,
        format: 'number',
        isLoading,
      };
    case 'closed_cases':
      return {
        label: statuses[CaseStatuses.closed].stats.title,
        value: countClosedCases,
        format: 'number',
        isLoading,
      };
    case 'average_time_to_close':
      return { label: ATTC_STAT, value: mttr, format: 'duration', isLoading };
    default:
      return {
        label: predefinedId,
        value: null,
        format: 'number',
        isLoading: false,
        errorMessage: KPI_METRIC_UNKNOWN,
      };
  }
};

const getResultTileValues = (
  metricId: string,
  label: string,
  { kpiResults, isLoadingKpiResults = false, isAnalyticsEnabled = false }: CasesMetricsProps
): KpiTileValues => {
  const base = { label, value: null, format: 'number' as const };

  if (!isAnalyticsEnabled) {
    return { ...base, isLoading: false, errorMessage: KPI_METRIC_ANALYTICS_DISABLED };
  }

  const result = kpiResults?.find(({ id }) => id === metricId);

  if (result == null) {
    return { ...base, isLoading: isLoadingKpiResults };
  }

  if (result.type === 'error') {
    return { ...base, isLoading: isLoadingKpiResults, errorMessage: result.message };
  }

  if (result.type === 'breakdown') {
    return { ...base, isLoading: isLoadingKpiResults, errorMessage: KPI_METRIC_UNKNOWN };
  }

  return {
    ...base,
    value: result.value,
    previousValue: result.previousValue,
    format: result.format,
    isLoading: isLoadingKpiResults,
  };
};

type KpiBreakdownTileValues = Pick<
  KpiBreakdownTileProps,
  'label' | 'result' | 'isLoading' | 'errorMessage'
>;

const getBreakdownTileValues = (
  { id, label }: CustomKpiMetricConfiguration,
  { kpiResults, isLoadingKpiResults = false, isAnalyticsEnabled = false }: CasesMetricsProps
): KpiBreakdownTileValues => {
  if (!isAnalyticsEnabled) {
    return { label, isLoading: false, errorMessage: KPI_METRIC_ANALYTICS_DISABLED };
  }

  const result = kpiResults?.find((kpiResult) => kpiResult.id === id);

  if (result?.type === 'error') {
    return { label, isLoading: isLoadingKpiResults, errorMessage: result.message };
  }

  if (result != null && result.type !== 'breakdown') {
    return { label, isLoading: isLoadingKpiResults, errorMessage: KPI_METRIC_UNKNOWN };
  }

  return { label, result, isLoading: isLoadingKpiResults };
};

const getDateHint = (metric: KpiMetricConfiguration): string | undefined =>
  metric.kind === 'custom' && metric.dateField === 'closed_at'
    ? KPI_METRIC_CLOSED_DATE_HINT
    : undefined;

const getKpiTileValues = (
  metric: KpiMetricConfiguration,
  props: CasesMetricsProps
): KpiTileValues => {
  if (metric.kind === 'custom') {
    return getResultTileValues(metric.id, metric.label, props);
  }

  if (isAnalyticsPredefinedKpiMetric(metric.predefinedId)) {
    return getResultTileValues(
      metric.id,
      PREDEFINED_LABELS[metric.predefinedId] ?? metric.predefinedId,
      props
    );
  }

  return getPredefinedTileValues(metric.predefinedId, props);
};

const CasesMetricsComponent: React.FC<CasesMetricsProps> = (props) => {
  const { countOpenCases, countInProgressCases, countClosedCases, mttr, isLoading, kpiMetrics } =
    props;
  const { euiTheme } = useEuiTheme();

  const mttrValue = useMemo(
    () => (mttr != null ? prettyMilliseconds(mttr * MTTR_MULTIPLIER, PRETTY_MS_OPTIONS) : '-'),
    [mttr]
  );

  const panelStyles = useMemo(
    () => css`
      border-radius: ${euiTheme.border.radius.panel};
    `,
    [euiTheme.border.radius.panel]
  );

  if (kpiMetrics != null) {
    if (kpiMetrics.length === 0) {
      return null;
    }

    return (
      <EuiPanel hasBorder paddingSize="m" grow={false} css={panelStyles}>
        <EuiFlexGrid columns={KPI_TILES_PER_ROW} data-test-subj="cases-kpi-tiles">
          {kpiMetrics.map((metric) => (
            <EuiFlexItem key={metric.id}>
              {metric.kind === 'custom' && metric.groupBy != null ? (
                <KpiBreakdownTile
                  {...getBreakdownTileValues(metric, props)}
                  direction={metric.direction}
                  dateHint={getDateHint(metric)}
                  dataTestSubj={`cases-kpi-tile-${metric.id}`}
                />
              ) : (
                <KpiMetricTile
                  {...getKpiTileValues(metric, props)}
                  threshold={metric.threshold}
                  direction={metric.direction}
                  dateHint={getDateHint(metric)}
                  dataTestSubj={`cases-kpi-tile-${metric.id}`}
                />
              )}
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="m" grow={false} css={panelStyles}>
      <EuiFlexGroup responsive={true} data-test-subj="cases-metrics-stats">
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="openStatsHeader"
            caseCount={countOpenCases}
            caseStatus={CaseStatuses.open}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="inProgressStatsHeader"
            caseCount={countInProgressCases}
            caseStatus={CaseStatuses['in-progress']}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="closedStatsHeader"
            caseCount={countClosedCases}
            caseStatus={CaseStatuses.closed}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiStat
            data-test-subj={'mttrStatsHeader'}
            description={
              <>
                {ATTC_STAT}
                &nbsp;
                <EuiIconTip
                  content={ATTC_DESCRIPTION}
                  position="right"
                  aria-label={ATTC_STAT_INFO_ARIA_LABEL}
                />
              </>
            }
            title={
              isLoading ? (
                <EuiLoadingSpinner data-test-subj={`mttr-stat-loading-spinner`} />
              ) : (
                mttrValue
              )
            }
            titleSize="xs"
            text-align="left"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
CasesMetricsComponent.displayName = 'CasesMetrics';

export const CasesMetrics = React.memo(CasesMetricsComponent);
