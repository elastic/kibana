/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transactionGroupsMainStatisticsRoute } from './groups_main_statistics';
import { transactionGroupsDetailedStatisticsRoute } from './groups_detailed_statistics';
import { transactionLatencyChartsRoute } from './latency_charts';
import { transactionTraceSamplesRoute } from './trace_samples';
import { transactionChartsBreakdownRoute } from './breakdown';
import { transactionChartsErrorRateRoute } from './error_rate';
import { transactionChartsColdstartRateRoute } from './coldstart_rate';
import { transactionChartsColdstartRateByTransactionNameRoute } from './coldstart_rate_by_transaction_name';

export const transactionsRouteDefinitions = {
  groupsMainStatistics: transactionGroupsMainStatisticsRoute,
  groupsDetailedStatistics: transactionGroupsDetailedStatisticsRoute,
  latencyCharts: transactionLatencyChartsRoute,
  traceSamples: transactionTraceSamplesRoute,
  chartsBreakdown: transactionChartsBreakdownRoute,
  chartsErrorRate: transactionChartsErrorRateRoute,
  chartsColdstartRate: transactionChartsColdstartRateRoute,
  chartsColdstartRateByTransactionName: transactionChartsColdstartRateByTransactionNameRoute,
};

export type { MergedServiceTransactionGroupsResponse } from './groups_main_statistics';
export type {
  ServiceTransactionGroupDetailedStatisticsResponse,
  ServiceTransactionGroupDetailedStat,
} from './groups_detailed_statistics';
export type { TransactionLatencyResponse } from './latency_charts';
export type { TransactionTraceSamplesResponse } from './trace_samples';
export type { TransactionBreakdownResponse } from './breakdown';
export type { FailedTransactionRateResponse } from './error_rate';
export type { ColdstartRateResponse } from './coldstart_rate';
export type { ColdstartRateByTransactionNameResponse } from './coldstart_rate_by_transaction_name';
