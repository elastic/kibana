/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CaseWorkflowRunOrigin, DocumentResponse } from '../../../common/types/api';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/constants';
import type { Case } from '../../../common/types/domain';
import { getRecord } from './alert_attachment_utils';

interface AlertPair {
  _id: string;
  _index: string;
}

/**
 * Reads the (id, index) pairs from `inputs.event.alertIds`. Both fields are
 * required: entries missing either value are silently dropped so they can
 * never accidentally match an attached pair.
 */
export const getSelectedAlertPairs = (inputs: Record<string, unknown>): AlertPair[] => {
  const event = getRecord(inputs.event);
  if (!event || !Array.isArray(event.alertIds)) {
    return [];
  }

  return event.alertIds
    .map(getRecord)
    .filter(
      (alert): alert is Record<string, unknown> =>
        alert !== undefined && typeof alert._id === 'string' && typeof alert._index === 'string'
    )
    .map((alert) => ({ _id: alert._id as string, _index: alert._index as string }));
};

/**
 * Validates that the requested workflow `origin` is consistent with `caseId`
 * and, when alert inputs are present, that every selected alert is attached
 * to the case.
 *
 * The alert-membership check is enforced regardless of `origin.type` so callers
 * cannot bypass it by using a `cases.case` or `cases.observable` origin type while
 * still injecting arbitrary alert documents into the workflow via `inputs.event.alertIds`.
 */
export const validateOrigin = ({
  origin,
  caseId,
  inputs,
  theCase,
  attachedAlerts,
}: {
  origin: CaseWorkflowRunOrigin;
  caseId: string;
  inputs: Record<string, unknown>;
  theCase: Case;
  attachedAlerts: DocumentResponse;
}): void => {
  // Step 1 — origin-entity membership checks
  if (origin.type === CASE_WORKFLOW_ORIGIN_TYPE || origin.type === ALERTS_WORKFLOW_ORIGIN_TYPE) {
    if (origin.caseId !== caseId) {
      throw Boom.badRequest(`Workflow origin caseId must match case id "${caseId}".`);
    }
  } else if (origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE) {
    if (origin.caseId !== caseId) {
      throw Boom.badRequest(`Workflow origin caseId must match case id "${caseId}".`);
    }
    if (!theCase.observables.some(({ id }) => id === origin.observableId)) {
      throw Boom.badRequest(
        `Observable "${origin.observableId}" does not belong to case "${caseId}".`
      );
    }
  } else if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE) {
    if (origin.caseId !== caseId) {
      throw Boom.badRequest(`Workflow origin caseId must match case id "${caseId}".`);
    }
  }

  // Step 2 — alert-membership check: applied whenever alertIds appear in inputs,
  // regardless of origin type, using (id, index) pairs for precise matching.
  const selectedPairs = getSelectedAlertPairs(inputs);
  if (selectedPairs.length > 0) {
    const attachedPairs = new Set(attachedAlerts.map(({ id, index }) => `${id}|${index}`));
    if (selectedPairs.some(({ _id, _index }) => !attachedPairs.has(`${_id}|${_index}`))) {
      throw Boom.badRequest('All selected alerts must belong to the case.');
    }
    // For a single-alert origin the named alert must also be among the selected ones.
    if (
      origin.type === ALERT_WORKFLOW_ORIGIN_TYPE &&
      !selectedPairs.some(({ _id }) => _id === origin.alertId)
    ) {
      throw Boom.badRequest(`Alert workflow origin "${origin.alertId}" is not selected.`);
    }
  } else if (
    origin.type === ALERT_WORKFLOW_ORIGIN_TYPE ||
    origin.type === ALERTS_WORKFLOW_ORIGIN_TYPE
  ) {
    // Alert-based origins require at least one selected alert in inputs.
    throw Boom.badRequest('Alert workflow origins require at least one selected alert.');
  }
};
