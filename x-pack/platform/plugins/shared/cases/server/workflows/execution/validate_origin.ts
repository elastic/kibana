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
  MAX_ALERTS_PER_CASE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/constants';
import type { Case } from '../../../common/types/domain';
import { getRecord } from './alert_attachment_utils';

interface AlertPair {
  _id: string;
  _index: string;
}

/**
 * Reads the (id, index) pairs from `inputs.event.alertIds`.
 *
 * Malformed entries are rejected, never skipped. The pairs returned here are the ones
 * `validateOrigin` checks for case membership, while alert preprocessing fetches from the *raw*
 * `inputs.event.alertIds` array — so dropping an entry would let it escape the membership check
 * and still be fetched and injected into the workflow event. A nullish `alertIds` is treated as
 * "no alert inputs" to match how preprocessing decides whether to expand alerts at all.
 */
export const parseSelectedAlertPairs = (inputs: Record<string, unknown>): AlertPair[] => {
  const { alertIds } = getRecord(inputs.event) ?? {};

  if (alertIds === undefined || alertIds === null) {
    return [];
  }

  if (!Array.isArray(alertIds)) {
    throw Boom.badRequest('inputs.event.alertIds must be an array.');
  }

  // A selected alert must be attached to the case, and a case holds at most MAX_ALERTS_PER_CASE
  // alerts, so anything larger cannot be legitimate — and would become an mget of that size.
  if (alertIds.length > MAX_ALERTS_PER_CASE) {
    throw Boom.badRequest(
      `inputs.event.alertIds cannot contain more than ${MAX_ALERTS_PER_CASE} alerts.`
    );
  }

  return alertIds.map((alert) => {
    const record = getRecord(alert);
    if (
      record === undefined ||
      typeof record._id !== 'string' ||
      typeof record._index !== 'string'
    ) {
      throw Boom.badRequest(
        'Every inputs.event.alertIds entry must be an object with string "_id" and "_index" properties.'
      );
    }

    return { _id: record._id, _index: record._index };
  });
};

/**
 * Validates that the requested workflow `origin` is consistent with `caseId`
 * and, when alert inputs are present, that every selected alert is attached
 * to the case.
 *
 * The alert-membership check is enforced regardless of `origin.type` so callers
 * cannot bypass it by using a `cases.case` or `cases.observable` origin type while
 * still injecting arbitrary alert documents into the workflow via `inputs.event.alertIds`.
 *
 * `selectedAlerts` must come from `parseSelectedAlertPairs` — it is the only reader of
 * `inputs.event.alertIds`, which keeps the validated set identical to the set that alert
 * preprocessing later fetches.
 */
export const validateOrigin = ({
  origin,
  caseId,
  selectedAlerts,
  theCase,
  attachedAlerts,
}: {
  origin: CaseWorkflowRunOrigin;
  caseId: string;
  selectedAlerts: AlertPair[];
  theCase: Case;
  attachedAlerts: DocumentResponse;
}): void => {
  // Step 1 — origin-entity membership checks.
  if (origin.caseId !== caseId) {
    throw Boom.badRequest(`Workflow origin caseId must match case id "${caseId}".`);
  }
  if (
    origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE &&
    !theCase.observables.some(({ id }) => id === origin.observableId)
  ) {
    throw Boom.badRequest(
      `Observable "${origin.observableId}" does not belong to case "${caseId}".`
    );
  }
  if (origin.type === OBSERVABLES_WORKFLOW_ORIGIN_TYPE) {
    const observableIdSet = new Set(theCase.observables.map(({ id }) => id));
    const seen = new Set<string>();
    for (const observableId of origin.observableIds) {
      if (seen.has(observableId)) {
        throw Boom.badRequest(
          `observableIds must not contain duplicates (found "${observableId}").`
        );
      }
      seen.add(observableId);
      if (!observableIdSet.has(observableId)) {
        throw Boom.badRequest(`Observable "${observableId}" does not belong to case "${caseId}".`);
      }
    }
  }

  // Step 2 — alert-membership check: applied whenever alertIds appear in inputs,
  // regardless of origin type, using (id, index) pairs for precise matching.
  // `selectedAlerts` comes from `parseSelectedAlertPairs` — the same parsed set that alert
  // preprocessing will later fetch, so the validated set and the fetched set are identical.
  if (selectedAlerts.length > 0) {
    const attachedPairs = new Set(attachedAlerts.map(({ id, index }) => `${id}|${index}`));
    if (selectedAlerts.some(({ _id, _index }) => !attachedPairs.has(`${_id}|${_index}`))) {
      throw Boom.badRequest('All selected alerts must belong to the case.');
    }
    // For a single-alert origin the named alert must also be among the selected ones.
    if (
      origin.type === ALERT_WORKFLOW_ORIGIN_TYPE &&
      !selectedAlerts.some(({ _id }) => _id === origin.alertId)
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
