/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesStatusRequest, CasesStatusResponse } from '../../../common/types/api';
import { CasesStatusRequestRt, CasesStatusResponseRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';
import { constructQueryOptions } from '../utils';
import { createCaseError } from '../../common/error';

export async function getStatusTotalsByType(
  params: CasesStatusRequest,
  clientArgs: CasesClientArgs
): Promise<CasesStatusResponse> {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(CasesStatusRequestRt)(params);

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getCaseStatuses
    );

    const options = constructQueryOptions({
      owner: queryParams.owner,
      from: queryParams.from,
      to: queryParams.to,
      authorizationFilter,
    });

    const statusStats = await caseService.getCaseStatusStats({
      searchOptions: options,
    });
    const res = {
      count_open_cases: statusStats.open,
      count_in_progress_cases: statusStats['in-progress'],
      count_closed_cases: statusStats.closed,
    };

    return decodeOrThrow(CasesStatusResponseRt)(res);
  } catch (error) {
    throw createCaseError({ message: `Failed to get status stats: ${error}`, error, logger });
  }
}
