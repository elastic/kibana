/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/api/workflow/v1';
import type { Case } from '../../../common/types/domain';
import { isAlertAttachmentType, toStringArray } from '../../../common/utils/attachments';

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const getSelectedAlertIds = (inputs: Record<string, unknown>): string[] => {
  const event = getRecord(inputs.event);
  if (!event || !Array.isArray(event.alertIds)) {
    return [];
  }

  return event.alertIds
    .map(getRecord)
    .map((alert) => alert?._id)
    .filter((id): id is string => typeof id === 'string');
};

const getAttachedAlertIds = (comments: NonNullable<Case['comments']>): Set<string> =>
  comments.reduce((alertIds, comment) => {
    if (!isAlertAttachmentType(comment.type)) {
      return alertIds;
    }

    let ids: string[] = [];
    if ('alertId' in comment) {
      ids = toStringArray(comment.alertId);
    } else if ('attachmentId' in comment) {
      ids = toStringArray(comment.attachmentId);
    }
    ids.forEach((id) => alertIds.add(id));
    return alertIds;
  }, new Set<string>());

export const validateOrigin = async ({
  origin,
  caseId,
  inputs,
  theCase,
}: {
  origin: CaseWorkflowRunOrigin;
  caseId: string;
  inputs: Record<string, unknown>;
  theCase: Case;
}): Promise<void> => {
  if (origin.type === CASE_WORKFLOW_ORIGIN_TYPE || origin.type === ALERTS_WORKFLOW_ORIGIN_TYPE) {
    if (origin.id !== caseId) {
      throw Boom.badRequest(`Workflow origin id must match case id "${caseId}".`);
    }
  }

  if (origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE) {
    if (!theCase.observables.some(({ id }) => id === origin.id)) {
      throw Boom.badRequest(`Observable "${origin.id}" does not belong to case "${caseId}".`);
    }
    return;
  }

  if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE || origin.type === ALERTS_WORKFLOW_ORIGIN_TYPE) {
    const attachedAlertIds = getAttachedAlertIds(theCase.comments ?? []);
    const selectedAlertIds = getSelectedAlertIds(inputs);
    if (selectedAlertIds.length === 0 || selectedAlertIds.some((id) => !attachedAlertIds.has(id))) {
      throw Boom.badRequest('All selected alerts must belong to the case.');
    }
    if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE && !selectedAlertIds.includes(origin.id)) {
      throw Boom.badRequest(`Alert workflow origin "${origin.id}" is not selected.`);
    }
  }
};
