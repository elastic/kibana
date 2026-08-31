/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE } from '../../common/constants';
import type { CaseWorkflowRunOrigin } from '../../common/types/api';
import { CASE_WORKFLOW_RUN_ORIGIN_TYPES } from '../../common/constants/workflow';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { getEbtOwner } from './get_ebt_owner';
import { useGetCaseConfiguration } from '../containers/configure/use_get_case_configuration';

/**
 * The bounded set of values for `origin_type`. Includes every `CaseWorkflowRunOrigin['type']`
 * value plus `'bulk'` for list-surface runs that carry no origin.
 */
export type WorkflowRunOriginType = (typeof CASE_WORKFLOW_RUN_ORIGIN_TYPES)[number] | 'bulk';

export interface WorkflowRunEbtParams {
  /** Which surface the run was triggered from. */
  originType: WorkflowRunOriginType;
  /** Number of cases in this run (1 for single-case surfaces, ≥2 for list bulk). */
  caseCount: number;
}

/**
 * Returns a stable reporter that fires `cases_workflow_run_triggered` after a
 * successful workflow start. Emit it **after** the API call resolves so a failed
 * start is not counted as a trigger.
 *
 * Never reports workflow IDs/names, tag values, case IDs, observable values, or inputs.
 */
export const useWorkflowRunTriggeredEBT = (): ((params: WorkflowRunEbtParams) => void) => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();
  const { data: configuration } = useGetCaseConfiguration();

  return useCallback(
    ({ originType, caseCount }: WorkflowRunEbtParams) => {
      analytics.reportEvent(CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        origin_type: originType,
        case_count: caseCount,
        tag_filter_active: (configuration?.workflowTags?.length ?? 0) > 0,
      });
    },
    [analytics, configuration?.workflowTags?.length, owner]
  );
};

/**
 * Derives a `WorkflowRunOriginType` from a `CaseWorkflowRunOrigin`, falling
 * back to `'bulk'` when the origin is absent.
 */
export const getWorkflowRunOriginType = (
  origin: CaseWorkflowRunOrigin | undefined
): WorkflowRunOriginType => origin?.type ?? 'bulk';
