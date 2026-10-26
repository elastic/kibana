/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUserActionStatsResponse } from '../../../common/types/api';
import { CaseUserActionStatsResponseSchema } from '../../../common/types/api';
import { decodeOrThrowZod } from '../../common/runtime_types';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { UserActionGet } from './types';
import type { CasesClient } from '../client';

export const getStats = async (
  { caseId }: UserActionGet,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<CaseUserActionStatsResponse> => {
  const {
    services: { userActionService },
    logger,
  } = clientArgs;

  try {
    await casesClient.cases.resolve({ id: caseId, includeComments: false });
    const totals = await userActionService.getCaseUserActionStats({
      caseId,
    });

    return decodeOrThrowZod(CaseUserActionStatsResponseSchema)(totals);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve user action stats for case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
