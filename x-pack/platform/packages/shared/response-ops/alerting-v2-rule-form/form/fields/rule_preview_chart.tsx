/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { usePreviewChart } from '../hooks/use_preview_chart';
import type { PreviewColumn } from '../hooks/use_preview';
import { useRuleFormServices } from '../contexts';

const CHART_HEIGHT = 180;

export interface PreviewChartProps {
  /** The assembled ES|QL query to visualize */
  query: string;
  /** The time field name for bucketing */
  timeField: string;
  /** The lookback duration string (e.g. '5m', '1h') */
  lookback: string;
  /** ES|QL columns from the preview query result (used for STATS query suggestions) */
  esqlColumns?: PreviewColumn[];
}

/**
 * Renders a Lens chart for the rule preview.
 *
 * For non-STATS ES|QL queries, this renders a time histogram (count over time).
 * For STATS queries, it uses the Lens suggestions API to pick an appropriate
 * chart type from the aggregated columns.
 *
 * Accepts the ES|QL query, time field, lookback, and optional columns as props
 * so it can be reused across both rule and recovery preview panels.
 *
 * This component renders only the chart content (no panel wrapper) and is
 * intended to be placed inside a parent panel such as `QueryResultsGrid`.
 */
export const PreviewChart = ({ query, timeField, lookback, esqlColumns }: PreviewChartProps) => {
  const { lensAttributes, timeRange, isLoading, hasError } = usePreviewChart({
    query,
    timeField,
    lookback,
    esqlColumns,
  });

  if (hasError) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="danger"
        title={i18n.translate('xpack.alertingV2.ruleForm.rulePreviewChart.errorTitle', {
          defaultMessage: 'Unable to load chart preview',
        })}
      />
    );
  }

  if (isLoading && !lensAttributes) {
    return (
      <EuiFlexGroup style={{ height: CHART_HEIGHT }} justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="l" data-test-subj="rulePreviewChartLoading" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!lensAttributes || !timeRange) {
    return null;
  }

  return <LensChart lensAttributes={lensAttributes} timeRange={timeRange} height={CHART_HEIGHT} />;
};

/**
 * Renders the Lens chart using the lens.EmbeddableComponent.
 *
 * Separated into its own component so that the parent can conditionally
 * render it based on the loading/error/empty states.
 */
const LensChart = ({
  lensAttributes,
  timeRange,
  height,
}: {
  lensAttributes: TypedLensByValueInput['attributes'];
  timeRange: { from: string; to: string };
  height: number;
}) => {
  const { lens } = useRuleFormServices();
  const LensComponent = lens.EmbeddableComponent;

  const chartStyle = useMemo(() => ({ height: `${height}px`, width: '100%' }), [height]);

  return (
    <div style={chartStyle} data-test-subj="rulePreviewChart">
      <LensComponent
        id="rulePreviewLensChart"
        viewMode="view"
        timeRange={timeRange}
        attributes={lensAttributes}
        noPadding
        disableTriggers
      />
    </div>
  );
};
