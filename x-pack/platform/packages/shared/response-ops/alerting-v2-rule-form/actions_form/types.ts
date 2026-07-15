/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';

export type InlineActionStepType = 'slack2.sendMessage' | 'email';
export type ActionSource = 'existing' | 'inline';

/**
 * Links a draft from an existing action policy (and workflow) back to its source,
 * so saving can update it in place / delete it rather than
 * creating a duplicate. Set only on drafts updated when editing a rule; drafts
 * the user adds leave this undefined so they are created on save.
 */
export interface ActionDraftOrigin {
  policyId: string;
  policyVersion?: string;
  workflowId: string;
}

export interface ExistingWorkflowActionDraft {
  id: string;
  source: 'existing';
  workflowId: string | null;
  origin?: ActionDraftOrigin;
}

export interface InlineWorkflowActionDraft {
  id: string;
  source: 'inline';
  stepType: InlineActionStepType;
  connectorId: string | null;
  params: string;
  origin?: ActionDraftOrigin;
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

/**
 * Validates the inline-action params YAML by parsing it (so both quoted and
 * unquoted scalars are handled) and requiring every field to be filled in.
 */
const areInlineParamsFilled = (params: string): boolean => {
  if (params.trim() === '') return false;

  let parsed: unknown;
  try {
    parsed = parse(params);
  } catch {
    return false;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false;

  const values = Object.values(parsed as Record<string, unknown>);
  return values.length > 0 && values.every(isFilledValue);
};

export const isActionValid = (action: ActionDraft): boolean =>
  action.source === 'existing'
    ? Boolean(action.workflowId)
    : action.connectorId !== null && areInlineParamsFilled(action.params);
