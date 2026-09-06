/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import { useHttp, useToasts } from '../../common/lib/kibana';
import { runCaseWorkflow } from './api';
import * as i18n from './translations';

type Http = ReturnType<typeof useHttp>;
type Toasts = ReturnType<typeof useToasts>;

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
  }: {
    http: Http;
    toasts: Toasts;
    caseId: string;
    origin: CaseWorkflowRunOrigin;
  }): RunWorkflowExecutor =>
  async ({ workflowId, inputs }) => {
    const response = await runCaseWorkflow({
      http,
      workflowId,
      body: { caseIds: [caseId], inputs, origin },
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
 * When the execution starts but the activity record fails to write, a warning
 * toast is shown without blocking or reporting a run failure to the caller.
 */
export const useCasesWorkflowExecutor = ({
  caseId,
  origin,
}: UseCasesWorkflowExecutorParams): RunWorkflowExecutor => {
  const http = useHttp();
  const toasts = useToasts();

  return useMemo(
    () => createCasesWorkflowExecutor({ http, toasts, caseId, origin }),
    [caseId, http, origin, toasts]
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

  return useMemo(
    () =>
      caseId === undefined || origin === undefined
        ? undefined
        : createCasesWorkflowExecutor({ http, toasts, caseId, origin }),
    [caseId, http, origin, toasts]
  );
};
