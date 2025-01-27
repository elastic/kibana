/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_ASSIGNEES_PER_CASE, MAX_USER_ACTIONS_PER_CASE } from '../../common/constants';
import type { CaseAssignees } from '../../common/types/domain';
import type { CaseUserActionService } from '../services';

export const areTotalAssigneesInvalid = (assignees?: CaseAssignees): boolean => {
  if (assignees == null) {
    return false;
  }

  return assignees.length > MAX_ASSIGNEES_PER_CASE;
};

export const validateMaxUserActions = async ({
  caseId,
  userActionService,
  userActionsToAdd,
}: {
  caseId: string;
  userActionService: CaseUserActionService;
  userActionsToAdd: number;
}) => {
  const result = await userActionService.getMultipleCasesUserActionsTotal({
    caseIds: [caseId],
  });

  const totalUserActions = result[caseId] ?? 0;

  if (totalUserActions + userActionsToAdd > MAX_USER_ACTIONS_PER_CASE) {
    throw Boom.badRequest(
      `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
    );
  }
};
