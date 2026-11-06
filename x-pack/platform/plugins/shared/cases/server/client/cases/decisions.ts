/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { Case } from '../../../common/types/domain';
import { UserActionTypes } from '../../../common/types/domain';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { CasesClient, CasesClientArgs } from '..';

export interface SetPendingDecisionsParams {
  caseId: string;
  count: number;
}

export type DecisionOutcome = 'approved' | 'dismissed';

export interface RecordDecisionParams {
  caseId: string;
  proposalId: string;
  title: string;
  outcome: DecisionOutcome;
  /** The case's pending decisions after this one. */
  pendingDecisions: number;
}

/**
 * Reads the case as the caller, so a case they can't open (restricted, another owner) answers
 * not-found, then checks they may update it.
 */
const getUpdatableCase = async (
  caseId: string,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Case> => {
  const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
  await clientArgs.authorization.ensureAuthorized({
    operation: Operations.updateCase,
    entities: [{ id: theCase.id, owner: theCase.owner }],
  });
  return theCase;
};

/**
 * The counter is bookkeeping, not an edit: it writes no user action and leaves `updated_at` to
 * the changes people make.
 */
const writePendingDecisions = async (
  caseId: string,
  count: number,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const { services } = clientArgs;
  const value = Math.max(0, Math.floor(count));
  for (let attempt = 1; attempt <= 2; attempt++) {
    const caseSo = await services.caseService.getCase({ id: caseId });
    if ((caseSo.attributes.pending_decisions ?? 0) === value) {
      return;
    }
    try {
      await services.caseService.patchCase({
        caseId,
        originalCase: caseSo,
        version: caseSo.version,
        updatedAttributes: { pending_decisions: value },
        refresh: 'wait_for',
      });
      return;
    } catch (error) {
      if (attempt === 2 || !SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
    }
  }
};

export const setPendingDecisions = async (
  { caseId, count }: SetPendingDecisionsParams,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<void> => {
  try {
    await getUpdatableCase(caseId, clientArgs, casesClient);
    await writePendingDecisions(caseId, count, clientArgs);
  } catch (error) {
    throw createCaseError({
      message: `Failed to set the pending decisions of case ${caseId}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
};

/** Records a proposal decided on the case, with the caller as the person who decided it. */
export const recordDecision = async (
  { caseId, proposalId, title, outcome, pendingDecisions }: RecordDecisionParams,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<void> => {
  try {
    const theCase = await getUpdatableCase(caseId, clientArgs, casesClient);
    await clientArgs.services.userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.decision,
        payload: { decision: { proposal_id: proposalId, title, outcome } },
        user: clientArgs.user,
        caseId,
        owner: theCase.owner,
      },
    });
    await writePendingDecisions(caseId, pendingDecisions, clientArgs);
  } catch (error) {
    throw createCaseError({
      message: `Failed to record the decision on proposal ${proposalId} for case ${caseId}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
};
