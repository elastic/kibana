/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type {
  ExtractObservablesResponse,
  ExtractObservablesStatus,
} from '../../../common/types/api';
import { CaseSchema } from '../../../common/types/domain';
import { decodeOrThrowZod } from '../../common/runtime_types';
import { flattenCaseSavedObject } from '../../common/utils';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { ExtractObservablesOutcome } from '../attachments/extract_observables';
import { extractObservablesFromAlerts } from '../attachments/extract_observables';
import { ensureUpdateAuthorized } from './observables';
import { emitObservablesAddedEvent } from './trigger_utils';

const getStatus = (outcome: ExtractObservablesOutcome): ExtractObservablesStatus =>
  outcome.status === 'no_matching_fields' ? 'no_new_observables' : outcome.status;

/**
 * Extracts observables for a case from the alerts and events that are attached to it.
 * Unlike the best-effort extraction that runs when an alert is attached, this operation
 * reports the outcome and throws on errors.
 */
export const extractCaseObservables = async (
  caseId: string,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<ExtractObservablesResponse> => {
  const {
    services: { attachmentService, caseService, licensingService },
    authorization,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to extract observables for cases, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  const retrievedCase = await caseService.getCase({ id: caseId });
  await ensureUpdateAuthorized(authorization, retrievedCase);

  if (!retrievedCase.attributes.settings?.extractObservables) {
    throw Boom.badRequest(
      `Observable extraction is turned off for case ${caseId}. Turn it on in the case settings, then try again.`
    );
  }

  const documents = await casesClient.attachments.getAllDocumentsAttachedToCase({
    caseId: retrievedCase.id,
  });

  const outcome: ExtractObservablesOutcome =
    documents.length === 0
      ? { status: 'alerts_not_found', alertsRequested: 0, alertsFound: 0 }
      : await extractObservablesFromAlerts(
          retrievedCase.id,
          documents.map(({ id, index }) => ({ id, index })),
          clientArgs
        );

  const resultingCase = outcome.status === 'extracted' ? outcome.caseWithPatch : retrievedCase;
  const attachmentStats = await attachmentService.getter.getCaseAttatchmentStats({
    caseIds: [retrievedCase.id],
  });
  const { userComments, alerts, events } = attachmentStats.get(retrievedCase.id) ?? {
    userComments: 0,
    alerts: 0,
    events: 0,
  };
  const decodedCase = decodeOrThrowZod(CaseSchema)(
    flattenCaseSavedObject({
      savedObject: resultingCase,
      totalComment: userComments,
      totalAlerts: alerts,
      totalEvents: events,
    })
  );

  if (outcome.status === 'extracted') {
    emitObservablesAddedEvent(clientArgs, outcome.caseWithPatch, outcome.newlyAddedObservables);
  }

  return {
    case: decodedCase,
    status: getStatus(outcome),
    newObservablesCount: outcome.status === 'extracted' ? outcome.newlyAddedObservables.length : 0,
    alertsRequested: outcome.alertsRequested,
    alertsFound: outcome.alertsFound,
  };
};
