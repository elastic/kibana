/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiLoadingChart, OnTimeChangeProps } from '@elastic/eui';
import { KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';

import { flyoutDegradedDocsTrendText } from '../../../../../common/translations';
import { useKibanaContextForPlugin } from '../../../../utils';
import { TimeRangeConfig } from '../../../../../common/types';
import { useQualityIssuesDocsChart } from '../../../../hooks';

const CHART_HEIGHT = 180;
const DISABLED_ACTIONS = [
  'ACTION_CUSTOMIZE_PANEL',
  'ACTION_CONFIGURE_IN_LENS',
  'ACTION_OPEN_IN_DISCOVER',
  'create-ml-ad-job-action',
];

interface TrendDocsChartProps
  extends Pick<
    ReturnType<typeof useQualityIssuesDocsChart>,
    'attributes' | 'isChartLoading' | 'onChartLoading' | 'extraActions'
  > {
  timeRange: TimeRangeConfig;
  lastReloadTime: number;
  onTimeRangeChange: (props: Pick<OnTimeChangeProps, 'start' | 'end'>) => void;
}

export function TrendDocsChart({
  attributes,
  isChartLoading,
  onChartLoading,
  extraActions,
  timeRange,
  lastReloadTime,
  onTimeRangeChange,
}: TrendDocsChartProps) {
  const {
    services: { lens },
  } = useKibanaContextForPlugin();

  const handleBrushEnd = useCallback(
    ({ range: [start, end] }: { range: number[] }) => {
      onTimeRangeChange({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    },
    [onTimeRangeChange]
  );

  return (
    <>
      <KibanaErrorBoundary>
        <EuiFlexGroup
          css={{ minHeight: CHART_HEIGHT }}
          direction="column"
          justifyContent="center"
          alignItems={isChartLoading === undefined ? 'center' : undefined}
        >
          {!attributes ? (
            <EuiLoadingChart title={flyoutDegradedDocsTrendText} size="l" />
          ) : (
            <lens.EmbeddableComponent
              id="datasetQualityFlyoutDegradedDocsTrend"
              css={lensEmbeddableComponentStyles}
              style={{ height: CHART_HEIGHT }}
              overrides={{
                settings: { legendAction: 'ignore' },
              }}
              viewMode={'view'}
              hidePanelTitles={true}
              disabledActions={DISABLED_ACTIONS}
              timeRange={timeRange}
              attributes={attributes!}
              withDefaultActions={true}
              extraActions={extraActions}
              disableTriggers={false}
              lastReloadRequestTime={lastReloadTime}
              onLoad={onChartLoading}
              onBrushEnd={handleBrushEnd}
            />
          )}
        </EuiFlexGroup>
      </KibanaErrorBoundary>
    </>
  );
}

const lensEmbeddableComponentStyles = css`
  .lnsExpressionRenderer__component {
    margin-left: -16px;

    .expExpressionRenderer__expression {
      padding: 0 !important;
    }
  }
`;
