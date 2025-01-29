/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';

import type { SingleCaseMetricsResponse } from '../../../common/types/api';
import { SingleCaseMetricsResponseRt, SingleCaseMetricsRequestRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetCaseMetricsParams } from './types';
import { buildHandlers } from './utils';

export const getCaseMetrics = async (
  { caseId, features }: GetCaseMetricsParams,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<SingleCaseMetricsResponse> => {
  const { logger } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(SingleCaseMetricsRequestRt)({ features });

    await checkAuthorization(caseId, clientArgs);
    const handlers = buildHandlers(
      { caseId, features: queryParams.features },
      casesClient,
      clientArgs
    );

    const computedMetrics = await Promise.all(
      Array.from(handlers).map(async (handler) => {
        return handler.compute();
      })
    );

    const mergedResults = computedMetrics.reduce((acc, metric) => {
      return merge(acc, metric);
    }, {}) as SingleCaseMetricsResponse;

    return decodeOrThrow(SingleCaseMetricsResponseRt)(mergedResults);
  } catch (error) {
    throw createCaseError({
      logger,
      message: `Failed to retrieve metrics within client for case id: ${caseId}: ${error}`,
      error,
    });
  }
};

const checkAuthorization = async (caseId: string, clientArgs: CasesClientArgs) => {
  const {
    services: { caseService },
    authorization,
  } = clientArgs;

  const caseInfo = await caseService.getCase({
    id: caseId,
  });

  await authorization.ensureAuthorized({
    operation: Operations.getCaseMetrics,
    entities: [{ owner: caseInfo.attributes.owner, id: caseInfo.id }],
  });
};
