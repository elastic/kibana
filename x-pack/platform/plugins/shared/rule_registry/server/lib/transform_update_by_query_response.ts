/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

export interface BulkUpdateApiResponse {
  total: number;
  updated: number;
  failures?: Array<{ id: string; index: string; code: string; message: string }>;
}

const transformUpdateByQueryErrorsResponse = (
  res: estypes.UpdateByQueryResponse
): NonNullable<BulkUpdateApiResponse['failures']> => {
  const errors =
    res.failures?.map((failure) => ({
      id: failure.id,
      index: failure.index,
      code: failure.cause.type,
      message: failure.cause.reason ?? 'unknown error',
    })) ?? [];

  return errors;
};

export const transformUpdateByQueryResponse = (
  res: estypes.UpdateByQueryResponse
): BulkUpdateApiResponse => {
  const failures = transformUpdateByQueryErrorsResponse(res);

  return {
    total: res.total ?? 0,
    updated: res.updated ?? 0,
    ...(failures.length > 0 ? { failures } : {}),
  };
};
