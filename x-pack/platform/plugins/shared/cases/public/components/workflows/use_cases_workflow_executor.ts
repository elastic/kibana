/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import { useHttp, useToasts } from '../../common/lib/kibana';
import { runCaseWorkflow } from './api';
import * as i18n from './translations';

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

      if (response.activityStatus === 'failed') {
        toasts.addWarning({ title: i18n.WORKFLOW_ACTIVITY_FAILED });
      }

      return { workflowExecutionId: response.workflowExecutionId };
    },
    [caseId, http, origin, toasts]
  );
};
