/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import {
  metricsExplorerMetricRT,
  metricsExplorerPageInfoRT,
  metricsExplorerColumnRT,
  metricsExplorerRowRT,
  metricsExplorerSeriesRT,
  metricsExplorerRequestBodyRT,
  metricsExplorerResponseRT,
  metricsExplorerAggregationRT,
  metricsExplorerColumnTypeRT,
} from '../../../common/http_api';

export type MetricsExplorerAggregation = rt.TypeOf<typeof metricsExplorerAggregationRT>;

export type MetricsExplorerColumnType = rt.TypeOf<typeof metricsExplorerColumnTypeRT>;

export type MetricsExplorerMetric = rt.TypeOf<typeof metricsExplorerMetricRT>;

export type MetricsExplorerPageInfo = rt.TypeOf<typeof metricsExplorerPageInfoRT>;

export type MetricsExplorerColumn = rt.TypeOf<typeof metricsExplorerColumnRT>;

export type MetricsExplorerRow = rt.TypeOf<typeof metricsExplorerRowRT>;

export type MetricsExplorerSeries = rt.TypeOf<typeof metricsExplorerSeriesRT>;

export type MetricsExplorerRequestBody = rt.TypeOf<typeof metricsExplorerRequestBodyRT>;

export type MetricsExplorerResponse = rt.TypeOf<typeof metricsExplorerResponseRT>;
