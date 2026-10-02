/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RunWorkflowTelemetry } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../common/types/api';
import {
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
} from '../../common/constants/workflow';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { getEbtOwner } from './get_ebt_owner';

/**
 * Telemetry-only origin for cases-list runs, which span cases and so carry no
 * `CaseWorkflowRunOrigin`. Not a real origin type.
 */
export const CASES_LIST_WORKFLOW_RUN_TELEMETRY_ORIGIN = 'cases.cases' as const;

/**
 * Maps a Cases run origin to the `origin` and `itemCount` reported by `RunWorkflowPanel`.
 * Attachment origins report the attachment type (such as `security.alert`) as the origin.
 */
export const getCaseWorkflowRunTelemetry = (
  origin: CaseWorkflowRunOrigin | undefined,
  caseCount: number
): Pick<RunWorkflowTelemetry, 'origin' | 'itemCount'> => {
  if (origin === undefined) {
    return { origin: CASES_LIST_WORKFLOW_RUN_TELEMETRY_ORIGIN, itemCount: caseCount };
  }

  switch (origin.type) {
    case CASE_WORKFLOW_ORIGIN_TYPE:
    case OBSERVABLE_WORKFLOW_ORIGIN_TYPE:
      return { origin: origin.type, itemCount: 1 };
    case OBSERVABLES_WORKFLOW_ORIGIN_TYPE:
      return { origin: origin.type, itemCount: origin.observableIds.length };
    case ATTACHMENT_WORKFLOW_ORIGIN_TYPE:
      return { origin: origin.attachmentType, itemCount: 1 };
    case ATTACHMENTS_WORKFLOW_ORIGIN_TYPE:
      return { origin: origin.attachmentType, itemCount: origin.attachmentIds.length };
  }
};

/** Returns the `RunWorkflowPanel` telemetry context for a Cases run, including the solution owner. */
export const useCaseWorkflowRunTelemetry = (
  origin: CaseWorkflowRunOrigin | undefined,
  caseCount: number
): RunWorkflowTelemetry => {
  const { owner } = useCasesContext();
  const ebtOwner = getEbtOwner(owner);

  return useMemo(
    () => ({ ...getCaseWorkflowRunTelemetry(origin, caseCount), owner: ebtOwner }),
    [caseCount, ebtOwner, origin]
  );
};
