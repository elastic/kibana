/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InlineActionStepType = 'slack2.sendMessage' | 'email';
export type ActionSource = 'existing' | 'inline';
export type ConnectorCreationConfig =
  | { readonly mode: 'flyout' }
  | { readonly mode: 'new-tab'; readonly href: string };

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

/**
 * A problem with an inline action's params. `key` names the offending top-level
 * param; it is omitted when the YAML itself is unusable (syntax error, not a map).
 */
export interface InlineActionParamError {
  readonly key?: string;
  readonly message: string;
}

export interface InlineActionErrors {
  readonly connector?: string;
  readonly params: readonly InlineActionParamError[];
}
