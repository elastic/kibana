/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import type { WorkflowOrigin } from '../../../common/types/domain';
import type { Case } from '../../../common/types/domain';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/api/workflow/v1';
import { isAlertAttachmentType, toStringArray } from '../../../common/utils/attachments';

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

/**
 * Enriches an activity origin with display data derived from the already-fetched case:
 * - `cases.alert` → adds `index` from the matching alert attachment (both legacy and unified-v2 shapes).
 * - `cases.observable` → adds `typeKey` and `value` from the matching observable.
 * - all other origins → returned unchanged.
 *
 * We derive enrichment from the case object (not from `inputs.event.*`) because
 * `preprocessAlertInputs` rewrites `event` into a different shape before the run, so
 * reading from `inputs` post-processing would be fragile.
 */
export const buildActivityOrigin = ({
  origin,
  theCase,
}: {
  origin: CaseWorkflowRunOrigin;
  theCase: Case;
}): WorkflowOrigin => {
  if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE) {
    const alertIndex = findAlertIndex(origin.id, theCase.comments ?? []);
    return alertIndex !== undefined ? { ...origin, index: alertIndex } : origin;
  }

  if (origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE) {
    const obs = theCase.observables.find(({ id }) => id === origin.id);
    if (obs) {
      return { ...origin, typeKey: obs.typeKey, value: obs.value };
    }
    return origin;
  }

  return origin;
};

/**
 * Finds the ES index for an alert identified by `alertId` among the case's alert attachments.
 * Handles both the legacy v1 shape (`alertId` + `index` parallel arrays) and the unified-v2
 * shape (`attachmentId` + `metadata.index`).
 */
const findAlertIndex = (
  alertId: string,
  comments: NonNullable<Case['comments']>
): string | undefined => {
  for (const comment of comments) {
    if (!isAlertAttachmentType(comment.type)) continue;

    if ('alertId' in comment) {
      // Legacy v1: alertId and index are parallel arrays.
      const ids = toStringArray(comment.alertId);
      const indices = toStringArray((comment as Record<string, unknown>).index ?? []);
      const pos = ids.indexOf(alertId);
      if (pos !== -1) {
        return indices[pos];
      }
    } else if ('attachmentId' in comment) {
      // Unified v2: id is attachmentId, index lives in metadata.index.
      const ids = toStringArray(comment.attachmentId);
      if (ids.includes(alertId)) {
        const meta = getRecord((comment as Record<string, unknown>).metadata);
        const metaIndices = meta ? toStringArray(meta.index) : [];
        const pos = ids.indexOf(alertId);
        return metaIndices[pos];
      }
    }
  }

  return undefined;
};
