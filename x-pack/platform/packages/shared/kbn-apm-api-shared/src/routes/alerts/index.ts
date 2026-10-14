/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transactionErrorRateChartPreviewRoute } from './transaction_error_rate_chart_preview';
import { errorCountChartPreviewRoute } from './error_count_chart_preview';
import { transactionDurationChartPreviewRoute } from './transaction_duration_chart_preview';

export const alertsRouteDefinitions = {
  transactionErrorRateChartPreview: transactionErrorRateChartPreviewRoute,
  errorCountChartPreview: errorCountChartPreviewRoute,
  transactionDurationChartPreview: transactionDurationChartPreviewRoute,
};

export type { AlertParams, PreviewChartResponse, PreviewChartResponseItem } from './types';
export type { TransactionErrorRateChartPreviewResponse } from './transaction_error_rate_chart_preview';
export type { ErrorCountChartPreviewResponse } from './error_count_chart_preview';
export type { TransactionDurationChartPreviewResponse } from './transaction_duration_chart_preview';
