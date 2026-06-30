/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { type Coordinate } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kueryRt,
  rangeRt,
  offsetRt,
  filtersRt,
  serviceTransactionDataSourceRt,
} from '../../default_api_types';

export interface FailedTransactionRateResponse {
  currentPeriod: {
    timeseries: Coordinate[];
    average: number | null;
  };
  previousPeriod: {
    timeseries: Coordinate[];
    average: number | null;
  };
}

export const transactionChartsErrorRateRoute = defineRoute<FailedTransactionRateResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.type({ transactionType: t.string, bucketSizeInSeconds: toNumberRt }),
      t.partial({ transactionName: t.string, filters: filtersRt }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt, serviceTransactionDataSourceRt]),
    ]),
  }),
});
