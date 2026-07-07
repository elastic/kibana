/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import dateMath from '@kbn/datemath';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { DataViewField, type DataView } from '@kbn/data-views-plugin/common';
import type { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import type { UnifiedHistogramFetchParamsExternal } from '@kbn/unified-histogram';
import {
  useUnifiedHistogram,
  UnifiedHistogramChart,
  UnifiedBreakdownFieldSelector,
} from '@kbn/unified-histogram';
import { useEpisodesHistogramQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_episodes_histogram_query';
import { useSpaceId } from '@kbn/alerting-v2-episodes-ui/hooks/use_space_id';
import {
  buildEpisodesHistogramQuery,
  type EpisodesFilterState,
} from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { computeBucketInterval } from '@kbn/alerting-v2-episodes-ui/utils/histogram_utils';
import { HISTOGRAM_BREAKDOWN_COLUMNS } from '@kbn/alerting-v2-episodes-ui/constants';
import { buildModifiedVisAttributes } from '@kbn/alerting-v2-episodes-ui/utils/episodes_color_mapping';
import type { AlertEpisodesKibanaServices } from '../../../../episodes_kibana_services';
import {
  EPISODES_HISTOGRAM_CAP_WARNING,
  EPISODES_HISTOGRAM_QUERY_ERROR,
  EPISODES_HISTOGRAM_RETRY,
} from '../../translations';

export interface EpisodesHistogramProps {
  services: AlertEpisodesKibanaServices;
  dataView: DataView | undefined;
  filterState: EpisodesFilterState;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  breakdownField?: string;
  onBreakdownFieldChange: (field: string | undefined) => void;
}

const autoInterval = (timeRange: TimeRange): string => {
  const startMs = dateMath.parse(timeRange.from)?.valueOf() ?? Date.now() - 86_400_000;
  const endMs = dateMath.parse(timeRange.to, { roundUp: true })?.valueOf() ?? Date.now();
  return computeBucketInterval(startMs, endMs);
};

export const EpisodesHistogram = ({
  services,
  dataView,
  filterState,
  timeRange,
  onTimeRangeChange,
  breakdownField,
  onBreakdownFieldChange,
}: EpisodesHistogramProps) => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId(services.spaces);
  const histogramSessionId = useMemo(() => `alerting_v2_histogram_${Date.now()}`, []);
  const [bucketInterval, setBucketInterval] = useState(() => autoInterval(timeRange));
  const prevTimeRange = useRef(timeRange);

  useEffect(() => {
    if (prevTimeRange.current !== timeRange) {
      setBucketInterval(autoInterval(timeRange));
      prevTimeRange.current = timeRange;
    }
  }, [timeRange]);

  const {
    table,
    isLoading: isDataLoading,
    isCapHit,
    error,
    refetch,
  } = useEpisodesHistogramQuery({
    services: { expressions: services.expressions, spaces: services.spaces },
    filterState,
    timeRange,
    bucketInterval,
    breakdownField,
  });

  const unifiedHistogramServices = useMemo(
    () => ({
      data: services.data,
      uiActions: services.uiActions,
      uiSettings: services.uiSettings,
      fieldFormats: services.fieldFormats,
      lens: services.lens,
      storage: services.storage,
      expressions: services.expressions,
      capabilities: services.application.capabilities,
      dataViews: services.dataViews,
    }),
    [
      services.data,
      services.uiActions,
      services.uiSettings,
      services.fieldFormats,
      services.lens,
      services.storage,
      services.expressions,
      services.application.capabilities,
      services.dataViews,
    ]
  );

  const onBrushEnd = useCallback(
    (brushData: BrushTriggerEvent['data']) => {
      const { range } = brushData;
      if (Array.isArray(range)) {
        onTimeRangeChange({
          from: new Date(range[0]).toISOString(),
          to: new Date(range[1]).toISOString(),
        });
      }
    },
    [onTimeRangeChange]
  );

  const onTimeIntervalChange = useCallback((interval?: string) => {
    // 'auto' means "let the chart decide" — skip to keep our computed interval
    if (interval && interval !== 'auto') setBucketInterval(interval);
  }, []);

  const { isInitialized, api, chartProps } = useUnifiedHistogram({
    services: unifiedHistogramServices,
    isChartLoading: isDataLoading || !dataView,
    onBrushEnd,
    onTimeIntervalChange,
  });

  const esqlQuery = useMemo<AggregateQuery>(
    () => ({
      esql: buildEpisodesHistogramQuery(spaceId, filterState, breakdownField).print('basic'),
    }),
    [spaceId, filterState, breakdownField]
  );

  const getModifiedVisAttributes = useCallback(
    (
      attributes: Parameters<
        NonNullable<UnifiedHistogramFetchParamsExternal['getModifiedVisAttributes']>
      >[0]
    ) => buildModifiedVisAttributes(attributes, breakdownField, filterState, euiTheme.colors),
    [breakdownField, filterState, euiTheme.colors]
  );

  useEffect(() => {
    if (!table || !dataView) return;
    api.fetch({
      requestAdapter: undefined,
      searchSessionId: histogramSessionId,
      dataView,
      query: esqlQuery,
      table,
      columns: table.columns,
      breakdownField,
      timeInterval: bucketInterval,
      timeRange,
      filters: [],
      getModifiedVisAttributes,
    });
  }, [
    api,
    dataView,
    esqlQuery,
    histogramSessionId,
    table,
    breakdownField,
    bucketInterval,
    timeRange,
    getModifiedVisAttributes,
  ]);

  // Reconstruct a DataViewField from the column id so UnifiedBreakdownFieldSelector can show
  // the current selection. column.name holds the human-readable label used as DataViewField.name.
  const breakdownDataViewField = useMemo(() => {
    if (!breakdownField) return undefined;
    const col = HISTOGRAM_BREAKDOWN_COLUMNS.find((c) => c.id === breakdownField);
    if (!col) return undefined;
    return new DataViewField({
      name: col.name,
      type: col.meta.type,
      searchable: true,
      aggregatable: false,
    });
  }, [breakdownField]);

  const handleBreakdownFieldChange = useCallback(
    (field: DataViewField | undefined) => {
      // UnifiedBreakdownFieldSelector hands back a DataViewField whose .name is the display label
      // (e.g. 'Status'). Map it back to the column id (e.g. 'episode.status') for storage.
      const col = HISTOGRAM_BREAKDOWN_COLUMNS.find((c) => c.name === field?.name);
      onBreakdownFieldChange(col?.id);
    },
    [onBreakdownFieldChange]
  );

  const renderBreakdownSelector = useCallback(
    () =>
      dataView ? (
        <UnifiedBreakdownFieldSelector
          dataView={dataView}
          breakdown={{ field: breakdownDataViewField }}
          esqlColumns={HISTOGRAM_BREAKDOWN_COLUMNS}
          onBreakdownFieldChange={handleBreakdownFieldChange}
        />
      ) : undefined,
    [dataView, breakdownDataViewField, handleBreakdownFieldChange]
  );

  return (
    <EuiPanel hasBorder paddingSize="xs" data-test-subj="episodesHistogramPanel">
      {error ? (
        <EuiCallOut
          announceOnMount
          title={EPISODES_HISTOGRAM_QUERY_ERROR}
          color="danger"
          iconType="error"
          size="s"
        >
          <EuiButton size="s" onClick={refetch}>
            {EPISODES_HISTOGRAM_RETRY}
          </EuiButton>
        </EuiCallOut>
      ) : (
        <>
          {isCapHit && (
            <EuiCallOut
              announceOnMount
              title={EPISODES_HISTOGRAM_CAP_WARNING}
              color="warning"
              iconType="warning"
              size="s"
            />
          )}
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            css={css`
              height: 192px;
              /*
               * TODO: Replace these selectors with a proper prop on UnifiedHistogramChart (e.g. withLensActions={false})
               */
              [data-test-subj='unifiedHistogramEditFlyoutVisualization'],
              [data-test-subj='unifiedHistogramSaveVisualization'] {
                display: none;
              }
            `}
          >
            <EuiFlexItem>
              {isInitialized && chartProps ? (
                <UnifiedHistogramChart
                  {...chartProps}
                  renderToggleActions={renderBreakdownSelector}
                />
              ) : (
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="center"
                  css={css`
                    height: 100%;
                  `}
                >
                  <EuiFlexItem grow={false}>
                    <EuiLoadingChart size="xl" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
