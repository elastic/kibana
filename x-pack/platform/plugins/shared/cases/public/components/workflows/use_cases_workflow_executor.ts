/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import { useAppUrl, useHttp, useKibana, useToasts } from '../../common/lib/kibana';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';
import { runCaseWorkflow } from './api';
import { buildViewExecutionText, getWorkflowExecutionPath } from './use_run_workflow_on_cases';
import * as i18n from './translations';

export interface CasesWorkflowExecutorDeps {
  http: ReturnType<typeof useHttp>;
  toasts: ReturnType<typeof useToasts>;
  getAppUrl: ReturnType<typeof useAppUrl>['getAppUrl'];
  rendering: ReturnType<typeof useKibana>['services']['rendering'];
  refreshCaseViewPage: () => void;
}

export interface UseCasesWorkflowExecutorParams {
  caseId: string;
  origin: CaseWorkflowRunOrigin;
}

/**
 * Builds the executor shared by every Cases-routed run surface. It owns the success or
 * activity-write warning toast, so callers must suppress the panel's built-in success toast.
 */
export const createCasesWorkflowExecutor =
  (
    { http, toasts, getAppUrl, rendering, refreshCaseViewPage }: CasesWorkflowExecutorDeps,
    { caseId, origin }: UseCasesWorkflowExecutorParams
  ): RunWorkflowExecutor =>
  async ({ workflowId, inputs }) => {
    const response = await runCaseWorkflow({
      http,
      workflowId,
      body: {
        caseIds: [caseId],
        inputs,
        origin,
      },
    });

    const executionHref = response.workflowExecutionId
      ? getAppUrl({ path: getWorkflowExecutionPath(workflowId, response.workflowExecutionId) })
      : undefined;

    const text =
      executionHref && rendering ? buildViewExecutionText(executionHref, rendering) : undefined;

    if (response.activityStatus === 'failed') {
      toasts.addWarning({ title: i18n.WORKFLOW_ACTIVITY_FAILED, text });
    } else {
      toasts.addSuccess({ title: i18n.RUN_WORKFLOW_STARTED(1), text });
    }
    refreshCaseViewPage();

    return { workflowExecutionId: response.workflowExecutionId };
  };

/**
 * Collects the services `createCasesWorkflowExecutor` needs. Must be called inside the Cases
 * React tree, because refreshing the case view uses the Cases query client.
 */
export const useCasesWorkflowExecutorDeps = (): CasesWorkflowExecutorDeps => {
  const http = useHttp();
  const toasts = useToasts();
  const { getAppUrl } = useAppUrl(WORKFLOWS_APP_ID);
  const { rendering } = useKibana().services;
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMemo(
    () => ({ http, toasts, getAppUrl, rendering, refreshCaseViewPage }),
    [getAppUrl, http, refreshCaseViewPage, rendering, toasts]
  );
};

/**
 * Returns a stable `RunWorkflowExecutor` that routes execution through the
 * Cases-owned endpoint, ensuring authorization, audit logging, and activity
 * recording are all handled server-side.
 */
export const useCasesWorkflowExecutor = ({
  caseId,
  origin,
}: UseCasesWorkflowExecutorParams): RunWorkflowExecutor => {
  const deps = useCasesWorkflowExecutorDeps();

  return useMemo(
    () => createCasesWorkflowExecutor(deps, { caseId, origin }),
    [caseId, deps, origin]
  );
};
