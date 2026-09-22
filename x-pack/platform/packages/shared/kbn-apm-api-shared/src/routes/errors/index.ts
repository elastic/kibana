/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  errorsMainStatisticsRoute,
  errorsMainStatisticsByTransactionNameRoute,
} from './error_groups_main_statistics';
import { errorsDetailedStatisticsRoute } from './error_groups_detailed_statistics';
import { errorGroupSamplesRoute } from './error_group_samples';
import { errorSampleDetailsRoute } from './error_sample_details';
import { errorDistributionRoute } from './error_distribution';
import { topErroneousTransactionsRoute } from './top_erroneous_transactions';

export const errorsRouteDefinitions = {
  mainStatistics: errorsMainStatisticsRoute,
  mainStatisticsByTransactionName: errorsMainStatisticsByTransactionNameRoute,
  detailedStatistics: errorsDetailedStatisticsRoute,
  groupSamples: errorGroupSamplesRoute,
  sampleDetails: errorSampleDetailsRoute,
  distribution: errorDistributionRoute,
  topErroneousTransactions: topErroneousTransactionsRoute,
};

export type { ErrorGroupMainStatisticsResponse } from './error_groups_main_statistics';
export type {
  ErrorGroupDetailedStat,
  ErrorGroupPeriodsResponse,
} from './error_groups_detailed_statistics';
export type { ErrorGroupSampleIdsResponse } from './error_group_samples';
export type { ErrorSampleDetailsResponse } from './error_sample_details';
export type { ErrorDistributionResponse } from './error_distribution';
export type { TopErroneousTransactionsResponse } from './top_erroneous_transactions';
