/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';
import { alertParamsRt, type PreviewChartResponse } from './types';

export interface TransactionDurationChartPreviewResponse {
  latencyChartPreview: PreviewChartResponse;
}

export const transactionDurationChartPreviewRoute =
  defineRoute<TransactionDurationChartPreviewResponse>()({
    endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
    params: t.type({ query: alertParamsRt }),
  });
