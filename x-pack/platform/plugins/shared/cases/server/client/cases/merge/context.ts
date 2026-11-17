/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { MergeCasesPreviewResponse } from '../../../../common/types/api';
import type { AttachmentV2, Case } from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import type { CasesClient } from '../../client';
import type { MergeAttachmentPlan } from './utils';
import { buildAttachmentPlan, buildFieldsPreview, orderCasesForMerge } from './utils';

export interface MergeContext {
  /** An existing destination first, then the rest oldest first. */
  orderedCases: Case[];
  destination?: Case;
  owner: string;
  fields: MergeCasesPreviewResponse['fields'];
  plan: MergeAttachmentPlan;
}

interface LoadMergeContextArgs {
  caseIds: string[];
  destinationCaseId?: string;
  excludedAttachments?: string[];
}

/**
 * Reads the cases and their attachments through the authorized client methods and rejects
 * selections that can't be merged.
 */
export const loadMergeContext = async (
  { caseIds, destinationCaseId, excludedAttachments = [] }: LoadMergeContextArgs,
  casesClient: CasesClient
): Promise<MergeContext> => {
  if (new Set(caseIds).size !== caseIds.length) {
    throw Boom.badRequest('Each case can be merged only once.');
  }

  if (destinationCaseId != null && !caseIds.includes(destinationCaseId)) {
    throw Boom.badRequest('The destination case must be one of the cases being merged.');
  }

  const { cases, errors } = await casesClient.cases.bulkGet({ ids: caseIds });

  if (errors.length > 0) {
    const [{ caseId, message, status }] = errors;
    throw new Boom.Boom(`Case ${caseId} can't be merged: ${message}`, {
      statusCode: status ?? 400,
    });
  }

  const owners = new Set(cases.map(({ owner }) => owner));
  if (owners.size > 1) {
    throw Boom.badRequest('Cases from different solutions cannot be merged.');
  }

  const orderedCases = orderCasesForMerge(cases, destinationCaseId);
  const destination =
    destinationCaseId != null ? orderedCases.find(({ id }) => id === destinationCaseId) : undefined;

  if (destination?.status === CaseStatuses.closed) {
    throw Boom.badRequest(`The destination case ${destination.id} is closed.`);
  }

  const attachmentsByCaseId = new Map<string, AttachmentV2[]>(
    await Promise.all(
      orderedCases.map(
        async ({ id }) => [id, await casesClient.attachments.getAll({ caseID: id })] as const
      )
    )
  );

  return {
    orderedCases,
    destination,
    owner: orderedCases[0].owner,
    fields: buildFieldsPreview(orderedCases, destination?.id),
    plan: buildAttachmentPlan({
      orderedCases,
      attachmentsByCaseId,
      destinationCaseId: destination?.id,
      excludedKeys: new Set(excludedAttachments),
    }),
  };
};
