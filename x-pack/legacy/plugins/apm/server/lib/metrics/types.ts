/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { APMAggregationInputTypes, APMSearchParams } from 'elasticsearch';
import { ChartType, YUnit } from '../../../typings/timeseries';

export interface ChartBase {
  title: string;
  key: string;
  type: ChartType;
  yUnit: YUnit;
  series: {
    [key: string]: {
      title: string;
      color?: string;
    };
  };
}

interface AllowedAggregationTypes {
  min?: APMAggregationInputTypes['min'];
  max?: APMAggregationInputTypes['max'];
  avg?: APMAggregationInputTypes['avg'];
  sum?: APMAggregationInputTypes['sum'];
  date_histogram?: APMAggregationInputTypes['date_histogram'];
}

export type SearchParams = Omit<APMSearchParams, 'body'> & {
  body: Omit<APMSearchParams['body'], 'aggs'> & {
    aggs: {
      timeseriesData: {
        date_histogram: APMAggregationInputTypes['date_histogram'];
        aggs: Record<string, AllowedAggregationTypes>;
      };
    } & Record<string, AllowedAggregationTypes>;
  };
};
