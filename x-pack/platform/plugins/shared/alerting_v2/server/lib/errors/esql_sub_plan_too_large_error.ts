/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isResponseError } from '@kbn/es-errors';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';

// Deterministic, non-retryable 400 returned when the INLINE STATS intermediate
// relation exceeds the ES sub-plan size cap (~20.4 MB on Serverless).
// Pinned to this reason string; a unit test guards against silent classifier drift.
const SUB_PLAN_REASON_SUBSTRING = 'sub-plan execution results too large';

export const isEsqlSubPlanTooLargeError = (error: unknown): boolean => {
  if (!isResponseError(error) || error.statusCode !== 400) {
    return false;
  }
  const body = error.body as ElasticsearchErrorDetails | undefined;
  const type = body?.error?.type ?? '';
  const reason = body?.error?.reason ?? '';
  return type === 'illegal_argument_exception' && reason.includes(SUB_PLAN_REASON_SUBSTRING);
};
