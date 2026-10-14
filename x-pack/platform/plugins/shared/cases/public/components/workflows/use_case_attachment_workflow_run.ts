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

/**
 * A row target (`attachmentId`) or a bulk target (`attachmentIds`, including a selection of one).
 * `attachmentIds` must not be empty.
 */
export type CaseAttachmentWorkflowTarget =
  | { attachmentId: string }
  | { attachmentIds: readonly string[] };

/**
 * Whether the surface renders inside a case, and if so whether the current user may run workflows
 * through Cases.
 *
 * - `outside`: not in a case. Runs use the Workflows API.
 * - `available`: in a case and the user may run workflows through Cases.
 * - `unavailable`: in a case but the user cannot run workflows through Cases.
 */
export type CaseAttachmentWorkflowRouting = 'outside' | 'available' | 'unavailable';

export interface UseCaseAttachmentWorkflowRunParams {
  attachmentType: string;
  /** Memoize it: a new object builds a new executor. */
  target: CaseAttachmentWorkflowTarget;
}

export interface CaseAttachmentWorkflowRunProps {
  /** Pass to `RunWorkflowPanel`. */
  runWorkflow: RunWorkflowExecutor | undefined;
  /** Pass to `RunWorkflowPanel`. */
  showSuccessToast: boolean;
}

/**
 * Returns the case routing state for an attachment surface, so it can gate its run action before
 * a target exists. Inside a case, hide the action unless this is `available` and the surface has
 * a target, so no run starts from a case without being recorded on it.
 */
export const useCaseAttachmentWorkflowRouting = (): CaseAttachmentWorkflowRouting =>
  useCaseAttachmentWorkflowContext().status;

/**
 * Returns `RunWorkflowPanel` props for a registered attachment surface. When routing is
 * `available`, `runWorkflow` is a Cases-routed executor that owns the success toast. Otherwise it
 * is `undefined` and the panel uses the Workflows API.
 */
export const useCaseAttachmentWorkflowRun = ({
  attachmentType,
  target,
}: UseCaseAttachmentWorkflowRunParams): CaseAttachmentWorkflowRunProps => {
  const context = useCaseAttachmentWorkflowContext();

  return useMemo(() => {
    if (context.status !== 'available') {
      return { runWorkflow: undefined, showSuccessToast: true };
    }

    const { caseId, createExecutor } = context;
    const origin: CaseWorkflowRunOrigin =
      'attachmentId' in target
        ? {
            type: ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
            caseId,
            attachmentType,
            attachmentId: target.attachmentId,
          }
        : {
            type: ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
            caseId,
            attachmentType,
            attachmentIds: [...target.attachmentIds],
          };

    return { runWorkflow: createExecutor(origin), showSuccessToast: false };
  }, [attachmentType, context, target]);
};
