/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { parse } from 'yaml';

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
 * A value is considered "filled" when it carries user-provided content. Empty
 * strings, empty arrays, and null/undefined (the placeholders shipped in the
 * param templates) are not filled. Objects/arrays are checked recursively.
 */
const isFilledValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0 && value.every(isFilledValue);
  if (typeof value === 'object') {
    const values = Object.values(value);
    return values.length > 0 && values.every(isFilledValue);
  }
  return true;
};

export interface InlineActionErrors {
  readonly connector?: string;
  readonly params: string[];
}

const connectorRequired = (): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.connectorRequired', {
    defaultMessage: 'Select a connector.',
  });

const invalidYaml = (reason: string): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.invalidYaml', {
    defaultMessage: 'Invalid YAML: {reason}',
    values: { reason },
  });

const paramsNotAMap = (): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.paramsNotAMap', {
    defaultMessage: 'Parameters must be a YAML map of field names to values.',
  });

const fieldRequired = (field: string): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.fieldRequired', {
    defaultMessage: '{field} is required.',
    values: { field },
  });

/**
 * Validates the inline-action params YAML by parsing it (so both quoted and
 * unquoted scalars are handled) and requiring every field to be filled in.
 */
const getParamsErrors = (params: string): string[] => {
  let parsed: unknown;
  try {
    parsed = parse(params, { logLevel: 'error' });
  } catch (err) {
    // The first line of the parser's message holds the reason and its location.
    const reason =
      err instanceof Error ? err.message.split('\n')[0].replace(/:$/, '') : String(err);
    return [invalidYaml(reason)];
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return [paramsNotAMap()];
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return [paramsNotAMap()];

  return entries.filter(([, value]) => !isFilledValue(value)).map(([key]) => fieldRequired(key));
};

/** Returns the reasons an inline action draft cannot be turned into a workflow. */
export const validateInlineAction = (action: InlineWorkflowActionDraft): InlineActionErrors => ({
  connector: action.connectorId === null ? connectorRequired() : undefined,
  params: getParamsErrors(action.params),
});

export const isActionValid = (action: ActionDraft): boolean => {
  if (action.source === 'existing') {
    return Boolean(action.workflowId);
  }

  const { connector, params } = validateInlineAction(action);
  return !connector && params.length === 0;
};
