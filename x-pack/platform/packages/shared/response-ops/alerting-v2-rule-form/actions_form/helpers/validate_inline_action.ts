/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getInlineActionStepDefinition } from '../registry';
import type {
  ActionDraft,
  InlineActionErrors,
  InlineActionParamError,
  InlineWorkflowActionDraft,
} from '../types';
import { parseInlineParams } from './parse_inline_params';

const connectorRequired = (): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.connectorRequired', {
    defaultMessage: 'Select a connector.',
  });

const unknownStepType = (stepType: string): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.unknownStepType', {
    defaultMessage: 'Unknown workflow step type: {stepType}.',
    values: { stepType },
  });

const validateParams = ({
  stepType,
  params,
}: InlineWorkflowActionDraft): readonly InlineActionParamError[] => {
  const definition = getInlineActionStepDefinition(stepType);
  if (!definition) {
    return [{ message: unknownStepType(stepType) }];
  }

  const result = parseInlineParams(params);
  return 'error' in result ? [result.error] : definition.validateParams(result.params);
};

/** Validates an inline action draft, returning the reasons it cannot be turned into a workflow. */
export const validateInlineAction = (draft: InlineWorkflowActionDraft): InlineActionErrors => ({
  connector: draft.connectorId ? undefined : connectorRequired(),
  params: validateParams(draft),
});

export const isActionValid = (action: ActionDraft): boolean => {
  if (action.source === 'existing') {
    return Boolean(action.workflowId);
  }

  const { connector, params } = validateInlineAction(action);
  return !connector && params.length === 0;
};
