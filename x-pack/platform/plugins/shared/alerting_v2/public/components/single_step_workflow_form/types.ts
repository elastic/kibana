/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SingleStepWorkflowTypeId = 'email' | 'slack';
export type SingleStepWorkflowKind = 'workflow' | 'slack' | 'email';

export interface WorkflowReferenceItem {
  id: string;
  kind: 'workflow';
  workflowId: string | null;
}

export interface SlackItem {
  id: string;
  kind: 'slack';
  connectorId: string | null;
  params: string;
}

export interface EmailItem {
  id: string;
  kind: 'email';
  connectorId: string | null;
  params: string;
}

export type ConnectorBackedItem = SlackItem | EmailItem;

export type SingleStepWorkflowItem = WorkflowReferenceItem | ConnectorBackedItem;

export type SingleStepWorkflowFormValue = SingleStepWorkflowItem[];

export const isItemValid = (item: SingleStepWorkflowItem): boolean => {
  if (item.kind === 'workflow') return Boolean(item.workflowId);
  return item.connectorId !== null && item.params.trim() !== '';
};
