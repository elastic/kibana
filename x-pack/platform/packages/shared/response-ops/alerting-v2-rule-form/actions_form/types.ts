/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { parseInlineParams } from './helpers/parse_inline_params';
import { getInlineActionStepDefinition } from './registry';

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

export interface InlineActionErrors {
  readonly connector?: string;
  readonly params: string[];
}

const connectorRequired = (): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.connectorRequired', {
    defaultMessage: 'Select a connector.',
  });

const getParamsErrors = ({ stepType, params }: InlineWorkflowActionDraft): string[] => {
  const definition = getInlineActionStepDefinition(stepType);
  return definition ? parseInlineParams(definition, params).errors : [];
};

/** Returns the reasons an inline action draft cannot be turned into a workflow. */
export const validateInlineAction = (action: InlineWorkflowActionDraft): InlineActionErrors => ({
  connector: action.connectorId === null ? connectorRequired() : undefined,
  params: getParamsErrors(action),
});

export const isActionValid = (action: ActionDraft): boolean => {
  if (action.source === 'existing') {
    return Boolean(action.workflowId);
  }

  const { connector, params } = validateInlineAction(action);
  return !connector && params.length === 0;
};
