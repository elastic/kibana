/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import type { CaseDeltaResponse, CaseViewedResponse } from '../../../common/types/api';
import { CaseDeltaResponseSchema, CaseViewedResponseSchema } from '../../../common/types/api';
import {
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_USER_ACTIONS_PER_CASE,
} from '../../../common/constants';
import { Operations } from '../../authorization';
import { combineFilters } from '../utils';
import { createCaseError } from '../../common/error';
import { decodeOrThrowZod } from '../../common/runtime_types';
import type { User } from '../../common/types/user';
import type { CasesClientArgs } from '../types';
import type { CasesClient } from '../client';
import { countDelta } from './delta_utils';
import type { UserActionGet, UserActionRecordView } from './types';

const EMPTY_COUNTS = { alerts: 0, comments: 0, changes: 0, evidence: 0 } as const;

const getUserKey = ({ profile_uid: profileUid, username }: User): string | null =>
  profileUid ?? username ?? null;

const getCaseKey = (caseId: string): string => `cases:${caseId}`;

export const recordView = async (
  { caseId, markSeen }: UserActionRecordView,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<CaseViewedResponse> => {
  const {
    services: { lastViewedService },
    logger,
    user,
  } = clientArgs;

  try {
    await casesClient.cases.resolve({ id: caseId, includeComments: false });

    const userKey = getUserKey(user);
    if (userKey == null) {
      return decodeOrThrowZod(CaseViewedResponseSchema)({ since: null });
    }

    const since = await lastViewedService.record({ userKey, key: getCaseKey(caseId), markSeen });
    return decodeOrThrowZod(CaseViewedResponseSchema)({ since });
  } catch (error) {
    throw createCaseError({
      message: `Failed to record view for case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

export const getDelta = async (
  { caseId }: UserActionGet,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<CaseDeltaResponse> => {
  const {
    services: { userActionService, lastViewedService },
    authorization,
    logger,
    user,
  } = clientArgs;

  try {
    const [{ filter: authorizationFilter, ensureSavedObjectsAreAuthorized }] = await Promise.all([
      authorization.getAuthorizationFilter(Operations.findUserActions),
      casesClient.cases.resolve({ id: caseId, includeComments: false }),
    ]);

    const userKey = getUserKey(user);
    const since =
      userKey == null
        ? null
        : await lastViewedService.getSeenAt({ userKey, key: getCaseKey(caseId) });

    if (since == null) {
      return decodeOrThrowZod(CaseDeltaResponseSchema)({ since: null, counts: EMPTY_COUNTS });
    }

    const sinceFilter = fromKueryExpression(
      `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.created_at > "${new Date(since).toISOString()}"`
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
      since,
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
