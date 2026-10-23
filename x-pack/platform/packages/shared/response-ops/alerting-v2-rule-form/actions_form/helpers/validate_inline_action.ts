/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getInlineActionStepDefinition } from '../registry';
import type { ActionDraft, InlineWorkflowActionDraft } from '../types';
import { parseInlineParams } from './parse_inline_params';

export interface InlineActionErrors {
  readonly connector?: string;
  readonly params: string[];
}

const connectorRequired = (): string =>
  i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.validation.connectorRequired', {
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
