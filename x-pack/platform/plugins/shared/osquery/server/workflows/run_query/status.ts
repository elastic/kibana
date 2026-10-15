/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunQueryOutput } from '../../../common/workflows/step_types/run_query/run_query_common';

export interface LiveQueryCounters {
  responded: number;
  pending: number;
  failed: number;
  successful: number;
}

/** First matching line of the status rule; `undefined` means keep polling. */
export const deriveRunQueryStatus = (
  counters: LiveQueryCounters,
  deadlinePassed: boolean
): RunQueryOutput['status'] | undefined => {
  if (deadlinePassed) {
    if (counters.responded === 0) return 'timed_out';
    if (counters.successful === 0) return 'failed';

    return 'partial';
  }

  if (counters.pending === 0) {
    if (counters.failed === 0) return 'success';
    if (counters.successful === 0) return 'failed';

    return 'partial';
  }

  return undefined;
};
