/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import { useAppUrl, useHttp, useKibana, useToasts } from '../../common/lib/kibana';
import {
  useWorkflowRunTriggeredEBT,
  getWorkflowRunOriginType,
} from '../../analytics/use_workflow_run_ebt';
import { runCaseWorkflow } from './api';
import { buildViewExecutionText } from './use_run_workflow_on_cases';
import * as i18n from './translations';

type Http = ReturnType<typeof useHttp>;
type Toasts = ReturnType<typeof useToasts>;

type ReportWorkflowRunTriggered = ReturnType<typeof useWorkflowRunTriggeredEBT>;

/**
 * Single source of truth for the Cases-routed execution call. Deliberately not a
 * hook so both hooks below can memoise over it without duplicating the request,
 * the activity-failed toast, or the response mapping.
 */
const createCasesWorkflowExecutor =
  ({
    http,
    toasts,
    caseId,
    origin,
    reportWorkflowRunTriggered,
  }: {
    http: Http;
    toasts: Toasts;
    caseId: string;
    origin: CaseWorkflowRunOrigin;
    reportWorkflowRunTriggered: ReportWorkflowRunTriggered;
  }): RunWorkflowExecutor =>
  async ({ workflowId, inputs }) => {
    const response = await runCaseWorkflow({
      http,
      workflowId,
      body: { caseIds: [caseId], inputs, origin },
    });

    // Report after the API resolves so only confirmed starts are counted.
    reportWorkflowRunTriggered({
      originType: getWorkflowRunOriginType(origin),
      caseCount: 1,
    });

    if (response.activityStatus === 'failed') {
      toasts.addWarning({ title: i18n.WORKFLOW_ACTIVITY_FAILED });
    }

    return { workflowExecutionId: response.workflowExecutionId };
  };

export interface UseCasesWorkflowExecutorParams {
  caseId: string;
  origin: CaseWorkflowRunOrigin;
}

/**
 * Returns a stable `RunWorkflowExecutor` that routes execution through the
 * Cases-owned endpoint, ensuring authorization, audit logging, and activity
 * recording are all handled server-side.
 *
 * The executor owns the success or activity-write warning toast so the caller
 * can suppress the panel's built-in success toast. When the activity record
 * fails to write, a warning toast is shown without blocking the caller.
 *
 * Fires a `cases_workflow_run_triggered` EBT event after the run is confirmed
 * to have started (i.e. after the API call resolves) so a failed request is
 * not counted as a trigger.
 */
export const useCasesWorkflowExecutor = ({
  caseId,
  origin,
}: UseCasesWorkflowExecutorParams): RunWorkflowExecutor => {
  const http = useHttp();
  const toasts = useToasts();
  const { getAppUrl } = useAppUrl(WORKFLOWS_APP_ID);
  const { rendering } = useKibana().services;
  const reportWorkflowRunTriggered = useWorkflowRunTriggeredEBT();

  return useCallback(
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

      // Report after the API resolves so only confirmed starts are counted.
      reportWorkflowRunTriggered({
        originType: getWorkflowRunOriginType(origin),
        caseCount: 1,
      });

      const executionHref = response.workflowExecutionId
        ? getAppUrl({ path: `${workflowId}?executionId=${response.workflowExecutionId}` })
        : undefined;

      const text =
        executionHref && rendering ? buildViewExecutionText(executionHref, rendering) : undefined;

      if (response.activityStatus === 'failed') {
        toasts.addWarning({ title: i18n.WORKFLOW_ACTIVITY_FAILED, text });
      } else {
        toasts.addSuccess({ title: i18n.RUN_WORKFLOW_STARTED(1), text });
      }

      return { workflowExecutionId: response.workflowExecutionId };
    },
    [caseId, getAppUrl, http, origin, rendering, reportWorkflowRunTriggered, toasts]
  );
};

export interface UseOptionalCasesWorkflowExecutorParams {
  caseId: string | undefined;
  origin: CaseWorkflowRunOrigin | undefined;
}

/**
 * Same executor as `useCasesWorkflowExecutor`, but for attachment surfaces that
 * may render outside a case (e.g. the alerts page or a flyout).
 *
 * Returns `undefined` when `caseId` or `origin` is absent — the caller should
 * pass the result to `RunWorkflowPanel`'s `runWorkflow` prop, which falls back
 * to its built-in generic executor when `undefined` is received.
 */
export const useOptionalCasesWorkflowExecutor = ({
  caseId,
  origin,
}: UseOptionalCasesWorkflowExecutorParams): RunWorkflowExecutor | undefined => {
  const http = useHttp();
  const toasts = useToasts();
  const reportWorkflowRunTriggered = useWorkflowRunTriggeredEBT();

  return useMemo(
    () =>
      caseId === undefined || origin === undefined
        ? undefined
        : createCasesWorkflowExecutor({ http, toasts, caseId, origin, reportWorkflowRunTriggered }),
    [caseId, http, origin, reportWorkflowRunTriggered, toasts]
  );
};
