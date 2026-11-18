/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { MAX_METRICS_PER_PAGE, PREDEFINED_KPI_METRICS } from '../../../common/constants';
import type { KpiMetricRequest } from '../../../common/types/api';
import type { KpiMetricConfiguration } from '../../../common/types/domain';
import { useCasesContext } from '../cases_context/use_cases_context';
import { KpiMetricFlyout } from './kpi_metric_flyout';
import * as i18n from './translations';

const DEFAULT_KPI_METRICS: KpiMetricRequest[] = PREDEFINED_KPI_METRICS.filter(
  ({ source }) => source === 'caseSearch'
).map(({ id }) => ({
  kind: 'predefined',
  predefinedId: id,
  display: 'value',
}));

const getMetricLabel = (metric: KpiMetricRequest): string =>
  metric.kind === 'predefined'
    ? i18n.PREDEFINED_LABELS[metric.predefinedId] ?? metric.predefinedId
    : metric.label;

const getMetricDescription = (metric: KpiMetricRequest): string => {
  if (metric.kind === 'predefined') {
    return i18n.PREDEFINED;
  }

  const { aggregation } = metric;
  const countLabel = metric.percent === true ? i18n.CALCULATION_PERCENT : i18n.AGGREGATION_COUNT;
  const calculation =
    aggregation == null || aggregation.type === 'count'
      ? countLabel
      : `${aggregation.type} ${aggregation.field ?? ''}`;

  return [metric.index, calculation, metric.query].filter(Boolean).join(' · ');
};

const getMetricKey = (metric: KpiMetricRequest, position: number): string =>
  metric.id ?? `${metric.kind}-${position}`;

export interface KpiMetricsSettingsProps {
  /**
   * The saved case list metrics. Undefined when the admin never saved a list.
   */
  kpiMetrics?: KpiMetricConfiguration[];
  isLoading: boolean;
  onSave: (metrics: KpiMetricRequest[]) => void;
}

const KpiMetricsSettingsComponent: React.FC<KpiMetricsSettingsProps> = ({
  kpiMetrics,
  isLoading,
  onSave,
}) => {
  const { permissions } = useCasesContext();
  const canEdit = permissions.settings && !isLoading;
  const [editPosition, setEditPosition] = useState<number | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const isDefaultList = kpiMetrics == null;
  const metrics: KpiMetricRequest[] = useMemo(
    () => kpiMetrics ?? DEFAULT_KPI_METRICS,
    [kpiMetrics]
  );

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setEditPosition(null);
  }, []);

  const openAddFlyout = useCallback(() => {
    setEditPosition(null);
    setIsFlyoutOpen(true);
  }, []);

  const openEditFlyout = useCallback((position: number) => {
    setEditPosition(position);
    setIsFlyoutOpen(true);
  }, []);

  const onDelete = useCallback(
    (position: number) => onSave(metrics.filter((_, index) => index !== position)),
    [metrics, onSave]
  );

  const onMove = useCallback(
    (position: number, offset: -1 | 1) => {
      const target = position + offset;
      if (target < 0 || target >= metrics.length) {
        return;
      }
      const reordered = [...metrics];
      [reordered[position], reordered[target]] = [reordered[target], reordered[position]];
      onSave(reordered);
    },
    [metrics, onSave]
  );

  const onSaveMetric = useCallback(
    (metric: KpiMetricRequest) => {
      const updated =
        editPosition == null
          ? [...metrics, metric]
          : metrics.map((item, index) => (index === editPosition ? metric : item));
      onSave(updated);
      closeFlyout();
    },
    [closeFlyout, editPosition, metrics, onSave]
  );

  return (
    <div data-test-subj="kpi-metrics-settings">
      {isDefaultList && (
        <>
          <EuiText size="s" color="subdued" data-test-subj="kpi-metrics-default-note">
            {i18n.DEFAULT_METRICS_NOTE}
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}
      {metrics.length === 0 && (
        <EuiText size="s" data-test-subj="kpi-metrics-empty">
          {i18n.NO_METRICS}
        </EuiText>
      )}
      {metrics.map((metric, position) => (
        <React.Fragment key={getMetricKey(metric, position)}>
          {position > 0 && <EuiHorizontalRule margin="xs" />}
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            data-test-subj={`kpi-metric-row-${position}`}
          >
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{getMetricLabel(metric)}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {getMetricDescription(metric)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.MOVE_UP} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleUp"
                  aria-label={i18n.MOVE_UP}
                  isDisabled={!canEdit || position === 0}
                  onClick={() => onMove(position, -1)}
                  data-test-subj={`kpi-metric-move-up-${position}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.MOVE_DOWN} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleDown"
                  aria-label={i18n.MOVE_DOWN}
                  isDisabled={!canEdit || position === metrics.length - 1}
                  onClick={() => onMove(position, 1)}
                  data-test-subj={`kpi-metric-move-down-${position}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.EDIT_METRIC} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="pencil"
                  aria-label={i18n.EDIT_METRIC}
                  isDisabled={!canEdit}
                  onClick={() => openEditFlyout(position)}
                  data-test-subj={`kpi-metric-edit-${position}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.DELETE_METRIC} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  aria-label={i18n.DELETE_METRIC}
                  isDisabled={!canEdit}
                  onClick={() => onDelete(position)}
                  data-test-subj={`kpi-metric-delete-${position}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      ))}
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          {metrics.length < MAX_METRICS_PER_PAGE ? (
            <EuiButtonEmpty
              iconType="plusCircle"
              size="s"
              isLoading={isLoading}
              isDisabled={!canEdit}
              onClick={openAddFlyout}
              data-test-subj="kpi-metric-add"
            >
              {i18n.ADD_METRIC}
            </EuiButtonEmpty>
          ) : (
            <EuiText size="s" data-test-subj="kpi-metrics-max">
              {i18n.MAX_METRICS_LIMIT(MAX_METRICS_PER_PAGE)}
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutOpen && (
        <KpiMetricFlyout
          metric={editPosition != null ? metrics[editPosition] : null}
          isLoading={isLoading}
          disabled={!canEdit}
          onClose={closeFlyout}
          onSave={onSaveMetric}
        />
      )}
    </div>
  );
};
KpiMetricsSettingsComponent.displayName = 'KpiMetricsSettings';

export const KpiMetricsSettings = React.memo(KpiMetricsSettingsComponent);
