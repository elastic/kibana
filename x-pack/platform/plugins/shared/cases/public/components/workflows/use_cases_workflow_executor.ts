/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { RunWorkflowExecutor, RunWorkflowExecutorParams } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import { useHttp, useToasts } from '../../common/lib/kibana';
import { runCaseWorkflow } from './api';
import * as i18n from './translations';

type ResolveCaseWorkflowRunOrigin = (params: RunWorkflowExecutorParams) => CaseWorkflowRunOrigin;

export interface UseCasesWorkflowExecutorParams {
  caseId: string;
  origin: CaseWorkflowRunOrigin | ResolveCaseWorkflowRunOrigin;
}

/** Returns a stable workflow executor that records the run in Cases activity. */
export const useCasesWorkflowExecutor = ({
  caseId,
  origin,
}: UseCasesWorkflowExecutorParams): RunWorkflowExecutor => {
  const http = useHttp();
  const toasts = useToasts();
  const resolveOrigin = typeof origin === 'function' ? origin : undefined;
  const originType = typeof origin === 'function' ? undefined : origin.type;
  const originId = typeof origin === 'function' ? undefined : origin.id;

  return useCallback(
    async (params) => {
      let workflowOrigin: CaseWorkflowRunOrigin | undefined;
      if (resolveOrigin) {
        workflowOrigin = resolveOrigin(params);
      } else if (originType !== undefined && originId !== undefined) {
        workflowOrigin = { type: originType, id: originId };
      }
      if (!workflowOrigin) {
        throw new Error('A Cases workflow origin is required.');
      }

      const response = await runCaseWorkflow({
        http,
        caseId,
        workflowId: params.workflowId,
        body: {
          inputs: params.inputs,
          origin: workflowOrigin,
        },
      });

      if (response.activityStatus === 'failed') {
        toasts.addWarning({ title: i18n.WORKFLOW_ACTIVITY_FAILED });
      }

      return { workflowExecutionId: response.workflowExecutionId };
    },
    [caseId, http, originId, originType, resolveOrigin, toasts]
  );
};
