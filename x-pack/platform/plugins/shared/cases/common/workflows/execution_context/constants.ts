/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE = 'cases.case' as const;
export const OBSERVABLE_WORKFLOW_EXECUTION_CONTEXT_TYPE = 'cases.observable' as const;
export const ALERT_WORKFLOW_EXECUTION_CONTEXT_TYPE = 'cases.alert' as const;
export const ALERTS_WORKFLOW_EXECUTION_CONTEXT_TYPE = 'cases.alerts' as const;
export const COMMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE = 'cases.comment' as const;
export const ATTACHMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE = 'cases.attachment' as const;

export const CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES = [
  CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  OBSERVABLE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  ALERT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  ALERTS_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  COMMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  ATTACHMENT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
] as const;

export type CasesWorkflowExecutionContextType =
  (typeof CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES)[number];
