/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../typings/common';
import { getTraceErrorsPerTransaction } from '../errors/get_trace_errors_per_transaction';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getTraceItems } from './get_trace_items';

export type TraceAPIResponse = PromiseReturnType<typeof getTrace>;
export interface TraceParams {
  traceId: string;
  size: string;
  from: string;
}
export async function getTrace(
  params: TraceParams,
  setup: Setup & SetupTimeRange
) {
  const [trace, errorsPerTransaction] = await Promise.all([
    getTraceItems(params, setup),
    getTraceErrorsPerTransaction(params.traceId, setup)
  ]);

  return {
    trace,
    errorsPerTransaction
  };
}
