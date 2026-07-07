/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt } from '@kbn/io-ts-utils';
import { AggregationType, type Coordinate } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { rangeRt } from '../../default_api_types';

const searchConfigurationRt = t.type({
  query: t.type({
    query: t.union([t.string, t.record(t.string, t.any)]),
    language: t.string,
  }),
});

export const alertParamsRt = t.intersection([
  t.partial({
    aggregationType: t.union([
      t.literal(AggregationType.Avg),
      t.literal(AggregationType.P95),
      t.literal(AggregationType.P99),
    ]),
    serviceName: t.string,
    errorGroupingKey: t.string,
    transactionType: t.string,
    transactionName: t.string,
  }),
  environmentRt,
  rangeRt,
  t.type({
    interval: t.string,
  }),
  t.partial({
    groupBy: t.array(t.string),
    searchConfiguration: jsonRt.pipe(searchConfigurationRt),
  }),
]);

export type AlertParams = t.TypeOf<typeof alertParamsRt>;

export interface PreviewChartResponseItem {
  name: string;
  data: Coordinate[];
}

export interface PreviewChartResponse {
  series: PreviewChartResponseItem[];
  totalGroups: number;
}
