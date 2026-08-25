/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import type { CasesMetricsRequest, CasesMetricsResponse } from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';
import { CasesMetricsRequestRt, CasesMetricsResponseRt } from '../../../common/types/api';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { buildHandlers } from './utils';

export const getCasesMetrics = async (
  params: CasesMetricsRequest,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<CasesMetricsResponse> => {
  const { logger } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(CasesMetricsRequestRt)(params);

    const handlers = buildHandlers(queryParams, casesClient, clientArgs);

    const computedMetrics = await Promise.all(
      Array.from(handlers).map(async (handler) => {
        return handler.compute();
      })
    );

    const mergedResults = computedMetrics.reduce((acc, metric) => {
      return merge(acc, metric);
    }, {}) as CasesMetricsResponse;

    return decodeOrThrow(CasesMetricsResponseRt)(mergedResults);
  } catch (error) {
    throw createCaseError({
      logger,
      message: `Failed to retrieve metrics within client for cases: ${error}`,
      error,
    });
  }
};
