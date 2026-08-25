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
} from '../../../common/types/api/workflow/v1';
import { findAlertIndex } from './alert_attachment_utils';

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
