/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useCallback } from 'react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { useToasts, useAppUrl, useKibana } from '../../common/lib/kibana';
import type { CasesUI } from '../../containers/types';
import { CASE_WORKFLOW_ORIGIN_TYPE } from '../../../common/types/domain/user_action/workflow/constants';
import { runCaseWorkflow } from './api';
import { useHttp } from '../../common/lib/kibana';
import * as i18n from './translations';

/**
 * Builds the `text` mount point for the "View execution" button, floated right,
 * matching the RunWorkflowPanel success toast style.
 */
const buildViewExecutionText = (executionHref: string, rendering: object) =>
  toMountPoint(
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiButton
        size="s"
        href={executionHref}
        target="_blank"
        rel="noopener noreferrer"
        data-test-subj="cases-run-workflow-view-execution-button"
      >
        {i18n.VIEW_WORKFLOW_EXECUTION}
      </EuiButton>
    </EuiFlexGroup>,
    rendering
  );

/**
 * Returns a stable `RunWorkflowExecutor` that handles 1..N selected cases.
 *
 * All selections — single or bulk — fire a single workflow execution via the
 * first case's endpoint. The event payload is always `{ caseIds: [id1, …] }`
 * so single and bulk runs are consistent and workflows can always iterate
 * over the list.
 *
 * The panel's built-in success toast must be suppressed (`showSuccessToast={false}`)
 * because this executor owns all toasting. On API error it rethrows so the
 * panel can show its own error toast.
 *
 * The panel always passes `{ ...manualInputs, ...panelInputs }` as `inputs`.
 * The caller must pass `inputs={}` at the panel level so this hook can inject
 * the `event` field without it being overridden by a shared value.
 */
export const useRunWorkflowOnCases = ({ cases }: { cases: CasesUI }): RunWorkflowExecutor => {
  const http = useHttp();
  const toasts = useToasts();
  const { getAppUrl } = useAppUrl(WORKFLOWS_APP_ID);
  const { rendering } = useKibana().services;

  return useCallback(
    async ({ workflowId, inputs }) => {
      const caseIds = cases.map(({ id }) => id);
      const { id: firstCaseId } = cases[0];
      const origin = { type: CASE_WORKFLOW_ORIGIN_TYPE, id: firstCaseId };

      const response = await runCaseWorkflow({
        http,
        caseId: firstCaseId,
        workflowId,
        body: {
          inputs: { ...inputs, event: { caseIds } },
          origin,
        },
      });

      const executionHref = response.workflowExecutionId
        ? getAppUrl({ path: `${workflowId}?executionId=${response.workflowExecutionId}` })
        : undefined;

      const text = executionHref ? buildViewExecutionText(executionHref, rendering) : undefined;

      if (response.activityStatus === 'failed') {
        toasts.addWarning({ title: i18n.WORKFLOW_ACTIVITY_FAILED, text });
      } else {
        toasts.addSuccess({ title: i18n.RUN_WORKFLOW_STARTED(cases.length), text });
      }

      return { workflowExecutionId: response.workflowExecutionId };
    },
    [cases, getAppUrl, http, rendering, toasts]
  );
};
