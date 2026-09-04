/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import { useHttp, useToasts } from '../../common/lib/kibana';
import { runCaseWorkflow } from './api';
import * as i18n from './translations';

/** Internal context value — not exported. Consumers use the exported hooks. */
interface CaseAttachmentWorkflowContextValue {
  caseId: string;
}

const CaseAttachmentWorkflowContext = createContext<CaseAttachmentWorkflowContextValue | undefined>(
  undefined
);

CaseAttachmentWorkflowContext.displayName = 'CaseAttachmentWorkflowContext';

interface CaseAttachmentWorkflowProviderProps {
  caseId: string;
  children: React.ReactNode;
}

/** Publishes the case id to all attachment-list children, enabling Cases-routed workflow runs. */
export const CaseAttachmentWorkflowProvider: React.FC<CaseAttachmentWorkflowProviderProps> = ({
  caseId,
  children,
}) => {
  const value = useMemo((): CaseAttachmentWorkflowContextValue => ({ caseId }), [caseId]);
  return (
    <CaseAttachmentWorkflowContext.Provider value={value}>
      {children}
    </CaseAttachmentWorkflowContext.Provider>
  );
};

CaseAttachmentWorkflowProvider.displayName = 'CaseAttachmentWorkflowProvider';

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
  const context = useContext(CaseAttachmentWorkflowContext);
  const http = useHttp();
  const toasts = useToasts();

  const executor = useCallback<RunWorkflowExecutor>(
    async ({ workflowId, inputs }) => {
      // Guard: caller must only invoke this after checking the hook returned a value.
      if (!context) throw new Error('Cases attachment workflow context is unavailable.');

      const { caseId } = context;
      const origin =
        alertId !== undefined
          ? { type: ALERT_WORKFLOW_ORIGIN_TYPE, caseId, alertId }
          : { type: ALERTS_WORKFLOW_ORIGIN_TYPE, caseId };

      const response = await runCaseWorkflow({
        http,
        workflowId,
        body: { caseIds: [caseId], inputs, origin },
      });

      if (response.activityStatus === 'failed') {
        toasts.addWarning({ title: i18n.WORKFLOW_ACTIVITY_FAILED });
      }

      return { workflowExecutionId: response.workflowExecutionId };
    },
    [alertId, context, http, toasts]
  );

  // Return undefined when rendered outside a case — the executor must not be called.
  return context !== undefined ? executor : undefined;
};
