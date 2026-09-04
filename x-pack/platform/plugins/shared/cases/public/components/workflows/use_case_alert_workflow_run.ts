/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Adding another attachment surface? See CaseWorkflowRunOriginSchema in
// common/types/api/workflow/v1.ts for the full cross-layer checklist.

import { useMemo } from 'react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import { useCaseAttachmentWorkflowContext } from './case_attachment_workflow_context';
import { useOptionalCasesWorkflowExecutor } from './use_cases_workflow_executor';

export interface UseCaseAlertWorkflowRunParams {
  /**
   * The alert id from the row-level context menu. Absent for bulk actions (even single-alert
   * bulk selections) — the origin type distinguishes the surface, not the cardinality.
   * - Present → `cases.alert` origin with the named alert id (single-row "Run workflow").
   * - Absent  → `cases.alerts` origin (toolbar bulk "Run workflow").
   */
  alertId?: string;
}

/**
 * Returns a Cases-routed `RunWorkflowExecutor` when rendered inside a case attachment surface,
 * or `undefined` when rendered outside a case (e.g. the alerts page, flyout).
 *
 * Pass to `RunWorkflowPanel`'s `runWorkflow` prop. When `undefined`, the panel falls back to its
 * built-in executor (the generic Workflows API) with no behaviour change.
 */
export const useCaseAlertWorkflowRun = ({
  alertId,
}: UseCaseAlertWorkflowRunParams): RunWorkflowExecutor | undefined => {
  const caseId = useCaseAttachmentWorkflowContext()?.caseId;

  const origin = useMemo((): CaseWorkflowRunOrigin | undefined => {
    if (caseId === undefined) return undefined;
    return alertId !== undefined
      ? { type: ALERT_WORKFLOW_ORIGIN_TYPE, caseId, alertId }
      : { type: ALERTS_WORKFLOW_ORIGIN_TYPE, caseId };
  }, [alertId, caseId]);

  return useOptionalCasesWorkflowExecutor({ caseId, origin });
};
