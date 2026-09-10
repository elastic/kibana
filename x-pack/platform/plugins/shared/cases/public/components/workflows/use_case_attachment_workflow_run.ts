/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import {
  ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import { useCaseAttachmentWorkflowContext } from './case_attachment_workflow_context';
import { useOptionalCasesWorkflowExecutor } from './use_cases_workflow_executor';

export interface UseCaseAttachmentWorkflowRunParams {
  attachmentType: string;
  /** Target for a row-level action. */
  attachmentId?: string;
  /** Targets for a bulk action, including a bulk selection of one. */
  attachmentIds?: readonly string[];
}

/**
 * Returns a Cases-routed executor for a registered attachment surface inside a case.
 */
export const useCaseAttachmentWorkflowRun = ({
  attachmentType,
  attachmentId,
  attachmentIds,
}: UseCaseAttachmentWorkflowRunParams): RunWorkflowExecutor | undefined => {
  const caseId = useCaseAttachmentWorkflowContext()?.caseId;

  const origin = useMemo((): CaseWorkflowRunOrigin | undefined => {
    if (caseId === undefined) {
      return undefined;
    }

    if (attachmentId !== undefined) {
      return {
        type: ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
        caseId,
        attachmentType,
        attachmentId,
      };
    }

    if (attachmentIds !== undefined && attachmentIds.length > 0) {
      return {
        type: ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
        caseId,
        attachmentType,
        attachmentIds: [...attachmentIds],
      };
    }

    return undefined;
  }, [attachmentId, attachmentIds, attachmentType, caseId]);

  return useOptionalCasesWorkflowExecutor({ caseId, origin });
};
