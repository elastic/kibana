/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import type { WorkflowOrigin, Case } from '../../../common/types/domain';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/constants';
import { findAlertIndex } from './alert_attachment_utils';

/**
 * Enriches an activity origin with display data derived from the already-fetched case:
 * - `cases.alert`      → adds `index` from the matching alert attachment (both legacy and unified-v2 shapes).
 * - `cases.observable` → adds `typeKey` and `value` from the matching observable.
 * - all other origins  → converted to the persisted `{ type, id: caseId }` shape.
 *
 * `theCase` is optional: for multi-case runs the sub-entity origin types (`cases.alert`,
 * `cases.observable`) are rejected before this function is called, so the enrichment branches
 * are never reached. Passing `undefined` makes the multi-case caller's intent explicit without
 * requiring a dummy case object.
 *
 * We derive enrichment from the case object (not from `inputs.event.*`) because
 * `preprocessAlertInputs` rewrites `event` into a different shape before the run, so
 * reading from `inputs` post-processing would be fragile.
 */
export const buildActivityOrigin = ({
  origin,
  theCase,
}: {
  origin?: CaseWorkflowRunOrigin;
  theCase?: Case;
}): WorkflowOrigin | undefined => {
  if (origin === undefined) {
    return undefined;
  }

  if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE) {
    const activityOrigin = { type: origin.type, id: origin.alertId };
    const alertIndex = theCase ? findAlertIndex(origin.alertId, theCase.comments ?? []) : undefined;
    return alertIndex !== undefined ? { ...activityOrigin, index: alertIndex } : activityOrigin;
  }

  if (origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE) {
    const activityOrigin = { type: origin.type, id: origin.observableId };
    const obs = theCase?.observables.find(({ id }) => id === origin.observableId);
    if (obs) {
      return { ...activityOrigin, typeKey: obs.typeKey, value: obs.value };
    }
    return activityOrigin;
  }

  return { type: origin.type, id: origin.caseId };
};
