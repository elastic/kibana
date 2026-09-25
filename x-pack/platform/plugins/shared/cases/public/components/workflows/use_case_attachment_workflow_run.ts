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

/**
 * Whether the surface renders inside a case, and if so whether the current user may run workflows
 * through Cases. Independent of the target, so it can gate a menu item before the panel renders.
 */
export type CaseAttachmentWorkflowRouting = 'outside' | 'available' | 'unavailable';

export interface UseCaseAttachmentWorkflowRunParams {
  attachmentType: string;
  /** Omit when the surface has no case attachment target. */
  target?: CaseAttachmentWorkflowTarget;
}

export interface CaseAttachmentWorkflowRunProps {
  /** Pass to `RunWorkflowPanel`. */
  runWorkflow: RunWorkflowExecutor | undefined;
  /** Pass to `RunWorkflowPanel`. */
  showSuccessToast: boolean;
  caseRouting: CaseAttachmentWorkflowRouting;
}

/**
 * Returns `RunWorkflowPanel` props and the case routing state for a registered attachment surface.
 *
 * - `outside`: not in a case. `runWorkflow` is `undefined` and the panel uses the Workflows API.
 * - `available`: in a case and the user may run workflows through Cases. With a target,
 *   `runWorkflow` is a Cases-routed executor that owns the success toast.
 * - `unavailable`: in a case but the user cannot run workflows through Cases.
 *
 * Inside a case, callers must hide their run action when `caseRouting` is `unavailable`, or when it
 * is `available` and they have no target, so no run starts from a case without being recorded on it.
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
    const caseRouting = context?.status ?? 'outside';
    const runWorkflow =
      context?.status === 'available' && origin !== undefined
        ? context.createExecutor(origin)
        : undefined;
    return { runWorkflow, showSuccessToast: runWorkflow === undefined, caseRouting };
  }, [context, origin]);
};
