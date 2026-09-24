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

/** A row target (`attachmentId`) or a bulk target (`attachmentIds`, including a selection of one). */
export type CaseAttachmentWorkflowTarget =
  | { attachmentId: string }
  | { attachmentIds: readonly string[] };

export interface UseCaseAttachmentWorkflowRunParams {
  attachmentType: string;
  /** Omit when the surface has no case attachment target; the run then uses the Workflows API. */
  target?: CaseAttachmentWorkflowTarget;
}

/** Props to spread onto `RunWorkflowPanel`. */
export interface CaseAttachmentWorkflowRunProps {
  runWorkflow: RunWorkflowExecutor | undefined;
  showSuccessToast: boolean;
}

/**
 * Returns `RunWorkflowPanel` props for a registered attachment surface. Inside a case, and when the
 * user may run workflows through Cases, `runWorkflow` is a Cases-routed executor that owns the
 * success toast. Otherwise `runWorkflow` is `undefined` and the panel uses the Workflows API.
 */
export const useCaseAttachmentWorkflowRun = ({
  attachmentType,
  target,
}: UseCaseAttachmentWorkflowRunParams): CaseAttachmentWorkflowRunProps => {
  const context = useCaseAttachmentWorkflowContext();
  const caseId = context?.caseId;
  const attachmentId =
    target !== undefined && 'attachmentId' in target ? target.attachmentId : undefined;
  const attachmentIds =
    target !== undefined && 'attachmentIds' in target ? target.attachmentIds : undefined;

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

  return useMemo(() => {
    const runWorkflow =
      context === undefined || origin === undefined ? undefined : context.createExecutor(origin);
    return { runWorkflow, showSuccessToast: runWorkflow === undefined };
  }, [context, origin]);
};
