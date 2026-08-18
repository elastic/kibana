/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionContext } from '@kbn/workflows';
import {
  ALERT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  ALERTS_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  ATTACHMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  COMMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  OBSERVABLE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
} from './constants';

export type CaseWorkflowExecutionContext = WorkflowExecutionContext & {
  type: typeof CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE;
};

export interface CaseWorkflowExecutionContextParent {
  type: typeof CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE;
  id: string;
}

type CaseEntityWorkflowExecutionContext<TType extends string> = WorkflowExecutionContext & {
  type: TType;
  parent: CaseWorkflowExecutionContextParent;
};

export type ObservableWorkflowExecutionContext = CaseEntityWorkflowExecutionContext<
  typeof OBSERVABLE_WORKFLOW_EXECUTION_CONTEXT_TYPE
>;

export type AlertWorkflowExecutionContext = CaseEntityWorkflowExecutionContext<
  typeof ALERT_WORKFLOW_EXECUTION_CONTEXT_TYPE
>;

export type AlertsWorkflowExecutionContext = CaseEntityWorkflowExecutionContext<
  typeof ALERTS_WORKFLOW_EXECUTION_CONTEXT_TYPE
>;

export type CommentWorkflowExecutionContext = CaseEntityWorkflowExecutionContext<
  typeof COMMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE
>;

export type AttachmentWorkflowExecutionContext = CaseEntityWorkflowExecutionContext<
  typeof ATTACHMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE
>;

export type CasesWorkflowExecutionContext =
  | CaseWorkflowExecutionContext
  | ObservableWorkflowExecutionContext
  | AlertWorkflowExecutionContext
  | AlertsWorkflowExecutionContext
  | CommentWorkflowExecutionContext
  | AttachmentWorkflowExecutionContext;

export const createCaseWorkflowExecutionContext = (
  caseId: string
): CaseWorkflowExecutionContext => ({
  type: CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  id: caseId,
});

const createCaseEntityWorkflowExecutionContext = <TType extends string>(
  type: TType,
  id: string,
  caseId: string
): CaseEntityWorkflowExecutionContext<TType> => ({
  type,
  id,
  parent: {
    type: CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
    id: caseId,
  },
});

export const createObservableWorkflowExecutionContext = (
  observableId: string,
  caseId: string
): ObservableWorkflowExecutionContext =>
  createCaseEntityWorkflowExecutionContext(
    OBSERVABLE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
    observableId,
    caseId
  );

export const createAlertWorkflowExecutionContext = (
  alertId: string,
  caseId: string
): AlertWorkflowExecutionContext =>
  createCaseEntityWorkflowExecutionContext(ALERT_WORKFLOW_EXECUTION_CONTEXT_TYPE, alertId, caseId);

export const createAlertsWorkflowExecutionContext = (
  caseId: string
): AlertsWorkflowExecutionContext =>
  createCaseEntityWorkflowExecutionContext(ALERTS_WORKFLOW_EXECUTION_CONTEXT_TYPE, caseId, caseId);

export const createCommentWorkflowExecutionContext = (
  commentId: string,
  caseId: string
): CommentWorkflowExecutionContext =>
  createCaseEntityWorkflowExecutionContext(
    COMMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
    commentId,
    caseId
  );

export const createAttachmentWorkflowExecutionContext = (
  attachmentId: string,
  caseId: string
): AttachmentWorkflowExecutionContext =>
  createCaseEntityWorkflowExecutionContext(
    ATTACHMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
    attachmentId,
    caseId
  );
