/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../helpers/setup_request';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import { rangeFilter } from '../helpers/range_filter';
import { ChartBase } from './types';
import { transformDataToMetricsChart } from './transform_metrics_chart';

interface Aggs {
  [key: string]: {
    min?: any;
    max?: any;
    sum?: any;
    avg?: any;
  };
}

interface Filter {
  exists?: {
    field: string;
  };
  term?: {
    [key: string]: string;
  };
}

export async function fetchAndTransformMetrics<T extends Aggs>({
  setup,
  serviceName,
  chartBase,
  aggs,
  additionalFilters = []
}: {
  setup: Setup;
  serviceName: string;
  chartBase: ChartBase;
  aggs: T;
  additionalFilters?: Filter[];
}) {
  const { start, end, uiFiltersES, client, config } = setup;

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'metric' } },
            {
              range: rangeFilter(start, end)
            },
            ...additionalFilters,
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        timeseriesData: {
          date_histogram: getMetricsDateHistogramParams(start, end),
          aggs
        },
        ...aggs
      }
    }
  };

  const response = await client.search(params);

  return transformDataToMetricsChart(response, chartBase);
}
