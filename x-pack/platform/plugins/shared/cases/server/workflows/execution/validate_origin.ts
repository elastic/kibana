/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isPlainObject } from 'lodash';
import type { CaseWorkflowRunOrigin, DocumentResponse } from '../../../common/types/api';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  MAX_ALERTS_PER_CASE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/constants';
import type { Case } from '../../../common/types/domain';

const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);
const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

interface DocumentPair {
  _id: string;
  _index: string;
}

export interface WorkflowSelectionTarget {
  id: string;
  index: string;
}

export type TriggerSelectionType = 'alert' | 'document';

/**
 * Reads the explicit (id, index) pairs from `inputs.event.alertIds`.
 *
 * Malformed entries are rejected, never skipped. The pairs returned here are the ones
 * `validateOrigin` checks for case membership, while alert preprocessing fetches from the *raw*
 * `inputs.event.alertIds` array — so dropping an entry would let it escape the membership check
 * and still be fetched and injected into the workflow event. A nullish `alertIds` is treated as
 * "no alert inputs" to match how preprocessing decides whether to expand alerts at all.
 */
export const parseSelectedAlertPairs = (inputs: Record<string, unknown>): DocumentPair[] => {
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

export const getTriggerSelectionType = (
  inputs: Record<string, unknown>
): TriggerSelectionType | undefined => {
  const { triggerType } = getRecord(inputs.event) ?? {};
  return triggerType === 'alert' || triggerType === 'document' ? triggerType : undefined;
};

/**
 * Reads the concrete pairs produced by trigger preprocessing. Document events accept both the
 * normalized `id`/`index` shape and the legacy `_id`/`_index` shape used by attachment surfaces.
 */
export const parseProcessedSelectionPairs = (
  inputs: Record<string, unknown>,
  selectionType: TriggerSelectionType
): WorkflowSelectionTarget[] => {
  const event = getRecord(inputs.event);
  const selection = event?.[selectionType === 'alert' ? 'alerts' : 'documents'];

  if (!Array.isArray(selection)) {
    throw Boom.badRequest(`Processed ${selectionType} selection must be an array.`);
  }

  return selection.map((entry) => {
    const record = getRecord(entry);
    const id = selectionType === 'alert' ? record?._id : record?.id ?? record?._id;
    const index = selectionType === 'alert' ? record?._index : record?.index ?? record?._index;
    const hasConflictingDocumentIdentity =
      selectionType === 'document' &&
      ((record?.id !== undefined && record?._id !== undefined && record.id !== record._id) ||
        (record?.index !== undefined &&
          record?._index !== undefined &&
          record.index !== record._index));

    if (typeof id !== 'string' || typeof index !== 'string' || hasConflictingDocumentIdentity) {
      throw Boom.badRequest(
        `Every processed ${selectionType} must contain string id and index properties.`
      );
    }

    return { id, index };
  });
};

export const validateOriginContext = ({
  origin,
  caseId,
  theCase,
}: {
  origin: CaseWorkflowRunOrigin;
  caseId: string;
  theCase: Case;
}): void => {
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
};

export const validateSelectionMembership = ({
  selectionType,
  selectedTargets,
  attachedDocuments,
}: {
  selectionType: TriggerSelectionType;
  selectedTargets: WorkflowSelectionTarget[];
  attachedDocuments: DocumentResponse;
}): void => {
  const attachedPairs = new Set(attachedDocuments.map(({ id, index }) => `${id}|${index}`));
  if (selectedTargets.some(({ id, index }) => !attachedPairs.has(`${id}|${index}`))) {
    const selectionLabel = selectionType === 'alert' ? 'alerts' : 'documents';
    throw Boom.badRequest(`All selected ${selectionLabel} must belong to the case.`);
  }
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
  selectedAlerts: DocumentPair[];
  theCase: Case;
  attachedAlerts: DocumentResponse;
}): void => {
  validateOriginContext({ origin, caseId, theCase });

  // Step 2 — alert-membership check: applied whenever alertIds appear in inputs,
  // regardless of origin type, using (id, index) pairs for precise matching.
  // `selectedAlerts` comes from `parseSelectedAlertPairs` — the same parsed set that alert
  // preprocessing will later fetch, so the validated set and the fetched set are identical.
  if (selectedAlerts.length > 0) {
    validateSelectionMembership({
      selectionType: 'alert',
      selectedTargets: selectedAlerts.map(({ _id, _index }) => ({
        id: _id,
        index: _index,
      })),
      attachedDocuments: attachedAlerts,
    });
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
