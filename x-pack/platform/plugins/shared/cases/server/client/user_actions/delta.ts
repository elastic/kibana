/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import type { CaseDeltaResponse } from '../../../common/types/api';
import { CaseDeltaRequestSchema, CaseDeltaResponseSchema } from '../../../common/types/api';
import {
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_USER_ACTIONS_PER_CASE,
} from '../../../common/constants';
import { Operations } from '../../authorization';
import { combineFilters } from '../utils';
import { createCaseError } from '../../common/error';
import { decodeOrThrowZod } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';
import type { CasesClient } from '../client';
import { countDelta } from './delta_utils';
import type { UserActionGetDelta } from './types';

export const getDelta = async (
  { caseId, since }: UserActionGetDelta,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<CaseDeltaResponse> => {
  const {
    services: { userActionService },
    authorization,
    logger,
    user,
  } = clientArgs;

  try {
    const { since: validSince } = decodeOrThrowZod(CaseDeltaRequestSchema)({ since });

    const [{ filter: authorizationFilter, ensureSavedObjectsAreAuthorized }] = await Promise.all([
      authorization.getAuthorizationFilter(Operations.findUserActions),
      casesClient.cases.resolve({ id: caseId, includeComments: false }),
    ]);

    const sinceFilter = fromKueryExpression(
      `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.created_at > "${new Date(
        validSince
      ).toISOString()}"`
    );

    const userActions = await userActionService.finder.findAll({
      caseId,
      filter: combineFilters([authorizationFilter, sinceFilter]),
      limit: MAX_USER_ACTIONS_PER_CASE,
      decode: false,
    });

    ensureSavedObjectsAreAuthorized(
      userActions.map((so) => ({ owner: so.attributes.owner, id: so.id }))
    );

    return decodeOrThrowZod(CaseDeltaResponseSchema)({
      since: validSince,
      counts: countDelta(
        userActions.map(({ attributes }) => attributes),
        user
      ),
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to compute delta for case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
