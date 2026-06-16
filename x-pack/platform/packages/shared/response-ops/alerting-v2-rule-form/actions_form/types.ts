/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InlineActionStepType = 'slack' | 'email';
export type ActionSource = 'existing' | 'inline';

export interface ExistingWorkflowActionDraft {
  id: string;
  source: 'existing';
  workflowId: string | null;
}

export interface InlineWorkflowActionDraft {
  id: string;
  source: 'inline';
  stepType: InlineActionStepType;
  connectorId: string | null;
  params: string;
}

export type ActionDraft = ExistingWorkflowActionDraft | InlineWorkflowActionDraft;

export type ActionTemplate =
  | { source: 'existing' }
  | { source: 'inline'; stepType: InlineActionStepType };

export const getActionTemplateKey = (template: ActionTemplate): string =>
  template.source === 'existing' ? 'existing-workflow' : `inline-${template.stepType}`;

export type ActionFormValue = ActionDraft[];

export const isActionValid = (action: ActionDraft): boolean =>
  action.source === 'existing'
    ? Boolean(action.workflowId)
    : action.connectorId !== null && action.params.trim() !== '';
