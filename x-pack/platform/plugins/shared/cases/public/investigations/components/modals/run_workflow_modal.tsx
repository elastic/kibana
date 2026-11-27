/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import { CASE_WORKFLOW_ORIGIN_TYPE } from '../../../../common/types/domain/user_action/workflow/constants';
import { useCaseWorkflowRunTelemetry } from '../../../analytics/use_case_workflow_run_telemetry';
import { RunCaseWorkflowModal } from '../../../components/workflows/run_case_workflow_modal';
import { useCaseWorkflowFilters } from '../../../components/workflows/use_run_case_workflow';
import { useCasesWorkflowExecutor } from '../../../components/workflows/use_cases_workflow_executor';
import { investigationKeys } from '../../api/query_keys';
import type { InvestigationModalProps } from './modal_props';

/**
 * Cases ingests a new case action into Activity only after it has settled, so the record is read
 * again a little after the longest wait (the server holds back actions younger than five seconds).
 */
const ACTIVITY_REFRESH_DELAY_MS = 6500;

/**
 * Take action > Run workflow. It is the Cases run-workflow modal and executor on the
 * investigation's case, so the same privileges, tags and Cases user action apply. The user action
 * becomes an Activity entry ("Ran the workflow ...").
 */
export const RunWorkflowModal: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const queryClient = useQueryClient();
  const { id: recordId, case_id: caseId } = record;
  const origin = useMemo(() => ({ type: CASE_WORKFLOW_ORIGIN_TYPE, caseId }), [caseId]);
  const inputs = useMemo(() => ({}), []);
  const { filterWorkflow, sortWorkflow } = useCaseWorkflowFilters();
  const telemetry = useCaseWorkflowRunTelemetry(origin);
  const casesRunWorkflow = useCasesWorkflowExecutor({ caseId, origin });

  const runWorkflow = useCallback<RunWorkflowExecutor>(
    async (args) => {
      const result = await casesRunWorkflow(args);
      window.setTimeout(() => {
        void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
      }, ACTIVITY_REFRESH_DELAY_MS);
      return result;
    },
    [casesRunWorkflow, queryClient, recordId]
  );

  return (
    <RunCaseWorkflowModal
      inputs={inputs}
      runWorkflow={runWorkflow}
      filterWorkflow={filterWorkflow}
      sortWorkflow={sortWorkflow}
      onClose={onClose}
      telemetry={telemetry}
    />
  );
};
RunWorkflowModal.displayName = 'RunWorkflowModal';
