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
 * Builds the set of `"id|index"` pairs that are attached to the case as alerts.
 * Both legacy (`alertId` + `index`) and unified (`attachmentId` + `metadata.index`)
 * attachment shapes are handled. Parallel arrays are zipped positionally.
 */
const getAttachedAlertPairSet = (comments: NonNullable<Case['comments']>): Set<string> => {
  const pairs = new Set<string>();

  for (const comment of comments) {
    if (isAlertAttachmentType(comment.type)) {
      let ids: string[] = [];
      let indices: string[] = [];

      if ('alertId' in comment) {
        // Legacy v1 alert attachment: alertId and index are parallel fields.
        ids = toStringArray(comment.alertId);
        indices = toStringArray((comment as Record<string, unknown>).index ?? []);
      } else if ('attachmentId' in comment) {
        // Unified v2 alert attachment: id is attachmentId, index lives in metadata.index.
        ids = toStringArray(comment.attachmentId);
        const meta = getRecord((comment as Record<string, unknown>).metadata);
        indices = meta ? toStringArray(meta.index) : [];
      }

      for (let i = 0; i < ids.length; i++) {
        pairs.add(`${ids[i]}|${indices[i] ?? ''}`);
      }
    }
  }

  return pairs;
};

/**
 * Validates origin rules for a **multi-case** run (`caseIds.length > 1`).
 *
 * Only `cases.case` origin type is legal for multi-case runs. Sub-entity origins
 * (`cases.observable`, `cases.alert`, `cases.alerts`) each reference an entity
 * within exactly one case and therefore require `caseIds.length === 1`.
 *
 * Alert inputs (`inputs.event.alertIds`) are also rejected for multi-case runs:
 * alert membership is verified per-case, so there is no meaningful check to
 * perform across N cases.
 */
export const validateMultiCaseOrigin = ({
  origin,
  caseIds,
  inputs,
}: {
  origin: CaseWorkflowRunOrigin;
  caseIds: string[];
  inputs: Record<string, unknown>;
}): void => {
  if (origin.type !== CASE_WORKFLOW_ORIGIN_TYPE) {
    throw Boom.badRequest(
      `Workflow origin type "${origin.type}" can only be used with a single case.`
    );
  }
  if (!caseIds.includes(origin.id)) {
    throw Boom.badRequest('Workflow origin id must be one of the requested case ids.');
  }
  if (getSelectedAlertPairs(inputs).length > 0) {
    throw Boom.badRequest('Alert inputs can only be used with a single case.');
  }
};

/**
 * Validates that the requested workflow `origin` is consistent with `caseId`
 * and, when alert inputs are present, that every selected alert is attached
 * to the case.
 *
 * The alert-membership check (fix: was previously skipped for non-alert
 * origins) is enforced regardless of `origin.type` so callers cannot bypass
 * it by using a `cases.case` or `cases.observable` origin type while still
 * injecting arbitrary alert documents into the workflow via `inputs.event.alertIds`.
 */
export const validateOrigin = ({
  origin,
  caseId,
  inputs,
  theCase,
}: {
  origin: CaseWorkflowRunOrigin;
  caseId: string;
  inputs: Record<string, unknown>;
  theCase: Case;
}): void => {
  // Step 1 — origin-entity membership checks
  if (origin.type === CASE_WORKFLOW_ORIGIN_TYPE || origin.type === ALERTS_WORKFLOW_ORIGIN_TYPE) {
    if (origin.id !== caseId) {
      throw Boom.badRequest(`Workflow origin id must match case id "${caseId}".`);
    }
  } else if (origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE) {
    if (!theCase.observables.some(({ id }) => id === origin.id)) {
      throw Boom.badRequest(`Observable "${origin.id}" does not belong to case "${caseId}".`);
    }
  }

  // Step 2 — alert-membership check: applied whenever alertIds appear in inputs,
  // regardless of origin type, using (id, index) pairs for precise matching.
  const selectedPairs = getSelectedAlertPairs(inputs);
  if (selectedPairs.length > 0) {
    const attachedPairs = getAttachedAlertPairSet(theCase.comments ?? []);
    if (selectedPairs.some(({ _id, _index }) => !attachedPairs.has(`${_id}|${_index}`))) {
      throw Boom.badRequest('All selected alerts must belong to the case.');
    }
    // For a single-alert origin the named alert must also be among the selected ones.
    if (
      origin.type === ALERT_WORKFLOW_ORIGIN_TYPE &&
      !selectedPairs.some(({ _id }) => _id === origin.id)
    ) {
      throw Boom.badRequest(`Alert workflow origin "${origin.id}" is not selected.`);
    }
  } else if (
    origin.type === ALERT_WORKFLOW_ORIGIN_TYPE ||
    origin.type === ALERTS_WORKFLOW_ORIGIN_TYPE
  ) {
    // Alert-based origins require at least one selected alert in inputs.
    throw Boom.badRequest('All selected alerts must belong to the case.');
  }
};
