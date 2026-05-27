/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SingleStepWorkflowTypeId = 'email' | 'slack';
export type SingleStepWorkflowKind = 'unselected' | 'workflow' | 'slack' | 'email';

export interface UnselectedWorkflowFormValue {
  kind: 'unselected';
}

export interface WorkflowReferenceFormValue {
  kind: 'workflow';
  workflowId: string | null;
}

export interface SlackWorkflowFormValue {
  kind: 'slack';
  connectorId: string | null;
  params: string;
}

export interface EmailWorkflowFormValue {
  kind: 'email';
  connectorId: string | null;
  params: string;
}

export type ConnectorBackedFormValue = SlackWorkflowFormValue | EmailWorkflowFormValue;

export type SingleStepWorkflowFormValue =
  | UnselectedWorkflowFormValue
  | WorkflowReferenceFormValue
  | ConnectorBackedFormValue;
