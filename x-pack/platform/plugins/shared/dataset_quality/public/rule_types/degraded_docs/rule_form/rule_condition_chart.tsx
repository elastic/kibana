/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { COMPARATORS } from '@kbn/alerting-comparators';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import rison from '@kbn/rison';
import React from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { PreviewChartResponse } from '../../../../common/api_types';
import { useKibanaContextForPlugin } from '../../../utils';
import { ChartPreview } from './chart_preview';
import {
  ErrorState,
  LoadingState,
  NoDataState,
  asPercent,
} from './chart_preview/chart_preview_helper';

export interface RuleConditionChartProps {
  threshold: number[];
  comparator: COMPARATORS;
  timeSize?: number;
  timeUnit?: TimeUnitChar;
  dataView?: DataView;
  groupBy?: string | string[];
  timeRange: TimeRange;
}

export function RuleConditionChart({
  threshold,
  comparator,
  timeSize,
  timeUnit,
  dataView,
  groupBy,
  timeRange,
}: RuleConditionChartProps) {
  const {
    services: { http, uiSettings },
  } = useKibanaContextForPlugin();
  const chartInterval = timeSize && timeUnit ? `${timeSize}${timeUnit}` : undefined;

  const { loading, value, error } = useAbortableAsync(
    async ({ signal }) => {
      if (dataView && timeRange.from && timeRange.to && chartInterval) {
        return http.get<PreviewChartResponse>(
          '/internal/dataset_quality/rule_types/degraded_docs/chart_preview',
          {
            query: {
              index: dataView?.getIndexPattern(),
              start: timeRange?.from,
              end: timeRange?.to,
              interval: chartInterval,
              groupBy: rison.encodeArray(Array.isArray(groupBy) ? groupBy : [groupBy]),
            },
          }
        );
      }
    },
    [http, dataView, groupBy, chartInterval, timeRange?.from, timeRange?.to]
  );

  return (
    <div>
      {loading ? (
        <LoadingState />
      ) : !value?.series || value.series.length === 0 ? (
        <NoDataState />
      ) : error ? (
        <ErrorState />
      ) : (
        <ChartPreview
          series={value.series}
          threshold={threshold}
          uiSettings={uiSettings}
          comparator={comparator}
          yTickFormat={(d: number | null) => asPercent(d, 100)}
          timeSize={timeSize}
          timeUnit={timeUnit}
          totalGroups={value.totalGroups}
        />
      )}
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default RuleConditionChart;
