/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CASE_WORKFLOW_ORIGIN_TYPE = 'cases.case' as const;
export const OBSERVABLE_WORKFLOW_ORIGIN_TYPE = 'cases.observable' as const;
export const ALERT_WORKFLOW_ORIGIN_TYPE = 'cases.alert' as const;
export const ALERTS_WORKFLOW_ORIGIN_TYPE = 'cases.alerts' as const;
export const COMMENT_WORKFLOW_ORIGIN_TYPE = 'cases.comment' as const;
export const ATTACHMENT_WORKFLOW_ORIGIN_TYPE = 'cases.attachment' as const;

export const CASE_WORKFLOW_RUN_ORIGIN_TYPES = [
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
] as const;

export const CASE_WORKFLOW_USER_ACTION_ORIGIN_TYPES = [
  ...CASE_WORKFLOW_RUN_ORIGIN_TYPES,
  COMMENT_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
] as const;

export type CaseWorkflowRunOriginType = (typeof CASE_WORKFLOW_RUN_ORIGIN_TYPES)[number];
export type CaseWorkflowUserActionOriginType =
  (typeof CASE_WORKFLOW_USER_ACTION_ORIGIN_TYPES)[number];
