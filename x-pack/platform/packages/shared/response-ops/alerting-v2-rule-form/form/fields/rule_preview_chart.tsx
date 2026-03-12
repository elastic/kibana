/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import { usePreviewChart } from '../hooks/use_preview_chart';

const CHART_HEIGHT = 180;

export interface PreviewChartProps {
  /** The assembled ES|QL query to visualize */
  query: string;
  /** The time field name for bucketing */
  timeField: string;
  /** The lookback duration string (e.g. '5m', '1h') */
  lookback: string;
}

/**
 * Renders a Lens bar chart showing the count of matching rows over time.
 *
 * Accepts the ES|QL query, time field, and lookback as props so it can be
 * reused across both rule and recovery preview panels.
 *
 * This component renders only the chart content (no panel wrapper) and is
 * intended to be placed inside a parent panel such as `QueryResultsGrid`.
 */
export const PreviewChart = ({ query, timeField, lookback }: PreviewChartProps) => {
  const { lensAttributes, chartQuery, isLoading, hasError } = usePreviewChart({
    query,
    timeField,
    lookback,
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

  if (!lensAttributes) {
    return null;
  }

  return (
    <LensChart
      key={chartQuery ?? undefined}
      lensAttributes={lensAttributes}
      height={CHART_HEIGHT}
    />
  );
};

/**
 * Renders the Lens embeddable chart using the EmbeddableRenderer pattern.
 *
 * Separated into its own component so the `getParentApi` callback can be
 * memoized on the Lens attributes without re-mounting the renderer on
 * every parent render.
 */
const LensChart = ({
  lensAttributes,
  height,
}: {
  lensAttributes: LensAttributes;
  height: number;
}) => {
  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        attributes: lensAttributes,
        viewMode: 'view' as const,
        esqlVariables: [],
      }),
      noPadding: true,
    }),
    [lensAttributes]
  );

  const chartStyle = useMemo(() => ({ height: `${height}px`, width: '100%' }), [height]);

  return (
    <div style={chartStyle} data-test-subj="rulePreviewChart">
      <EmbeddableRenderer type="lens" getParentApi={getParentApi} hidePanelChrome />
    </div>
  );
};
