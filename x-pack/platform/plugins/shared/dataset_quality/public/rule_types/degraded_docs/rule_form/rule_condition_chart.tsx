/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import { DataView } from '@kbn/data-views-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import rison from '@kbn/rison';
import React from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import { PreviewChartResponse } from '../../../../common/api_types';
import { useKibanaContextForPlugin } from '../../../utils';
import { ChartPreview } from './chart_preview';
import {
  ErrorState,
  LoadingState,
  NoDataState,
  asPercent,
} from './chart_preview/chart_preview_helper';

interface ChartOptions {
  interval?: string;
}

export interface RuleConditionChartProps {
  threshold: number[];
  comparator: COMPARATORS;
  timeSize?: number;
  timeUnit?: TimeUnitChar;
  dataView?: DataView;
  groupBy?: string | string[];
  timeRange: TimeRange;
  chartOptions?: ChartOptions;
}

export function RuleConditionChart({
  threshold,
  comparator,
  timeSize,
  timeUnit,
  dataView,
  groupBy,
  timeRange,
  chartOptions: { interval } = {},
}: RuleConditionChartProps) {
  const {
    services: { http, uiSettings },
  } = useKibanaContextForPlugin();

  const { loading, value, error } = useAbortableAsync(
    async ({ signal }) => {
      if (dataView && timeRange.from && timeRange.to) {
        return http.get<PreviewChartResponse>(
          '/internal/dataset_quality/rule_types/degraded_docs/chart_preview',
          {
            query: {
              index: dataView?.getIndexPattern(),
              start: timeRange?.from,
              end: timeRange?.to,
              interval: interval || `${timeSize}${timeUnit}`,
              groupBy: rison.encodeArray(Array.isArray(groupBy) ? groupBy : [groupBy]),
            },
          }
        );
      }
    },
    [http, dataView, groupBy, interval, timeRange?.from, timeRange?.to, timeSize, timeUnit]
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
