/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

type BulkUpdateErrorResponse = Array<{
  status: 'error';
  id: string;
  index: string;
  error: { code: string; message: string };
}>;

type BulkUpdateSuccessResponse = Array<{
  status: 'success';
  id: string;
}>;

export interface BulkUpdateApiResponse {
  total: number;
  updated: number;
  results?: Array<{
    status: 'success' | 'error';
    id: string;
    index?: string;
    error?: { code: string; message: string };
  }>;
}

const transformUpdateByQueryErrorsResponse = (
  res: estypes.UpdateByQueryResponse
): BulkUpdateErrorResponse => {
  const errors =
    res.failures?.map((failure) => ({
      id: failure.id,
      index: failure.index,
      status: 'error' as const,
      error: { code: failure.cause.type, message: failure.cause.reason ?? 'unknown error' },
    })) ?? [];

  return errors;
};

const transformUpdateByQuerySuccessResponse = (ids: string[]): BulkUpdateSuccessResponse => {
  return ids.map((id) => ({
    id,
    status: 'success' as const,
  }));
};

export const transformUpdateByQueryResponse = (
  res: estypes.UpdateByQueryResponse,
  ids?: string[]
): BulkUpdateApiResponse => {
  const updatedIds = new Set<string>(ids ?? []);
  const failedIds = new Set<string>(res.failures?.map((failure) => failure.id) ?? []);
  const successfulUpdatedIds = getDiffereceBetweenSets(updatedIds, failedIds);

  return {
    total: res.total ?? 0,
    updated: res.updated ?? 0,
    results: [
      ...transformUpdateByQuerySuccessResponse(Array.from(successfulUpdatedIds)),
      ...transformUpdateByQueryErrorsResponse(res),
    ],
  };
};

const getDiffereceBetweenSets = (setA: Set<string>, setB: Set<string>): Set<string> => {
  const difference = new Set<string>(setA);

  for (const item of setB) {
    difference.delete(item);
  }

  return difference;
};
