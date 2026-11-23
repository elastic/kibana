/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { MAX_DESCRIPTION_LENGTH } from '../../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeConflict,
  MergeExtendedFieldPreview,
  MergeOptionIssue,
} from '../../../../common/types/api';
import type { MergeFieldChoices, MergeFieldKey, MergeSingleFieldKey } from '../utils';
import { getConflictKey, hasFieldChoice } from '../utils';
import * as i18n from './translations';

/** The state a field on the Differences step is in. */
export type FieldStateKind =
  | 'chooseOne'
  | 'chosen'
  | 'own'
  | 'invalid'
  | 'required'
  | 'overLimit'
  | 'combined'
  | 'locked'
  | 'same';

/** The states that keep the user on the Differences step. */
export type BlockingStateKind = 'chooseOne' | 'invalid' | 'required' | 'overLimit';

export interface DifferencesBlocker {
  key: MergeFieldKey;
  label: string;
  state: BlockingStateKind;
}

export interface DifferencesSummary {
  /** Fields that need a decision: they differ, are required, are invalid or are over a limit. */
  total: number;
  /** How many of those are settled. */
  resolved: number;
  /** The unsettled ones, in the order the step shows them. */
  blocking: DifferencesBlocker[];
}

const CUSTOM_PREFIX = 'customFields.';
const EXTENDED_PREFIX = 'extendedFields.';

type SingleRowField = Extract<
  MergeSingleFieldKey,
  'title' | 'description' | 'severity' | 'category' | 'connector' | 'template'
>;

/** The single-value fields every merge has, in the order the step shows them. */
export const SINGLE_ROW_FIELDS: readonly SingleRowField[] = [
  'template',
  'title',
  'description',
  'severity',
  'category',
  'connector',
];

const SINGLE_FIELD_LABELS: Record<SingleRowField | 'tags' | 'assignees', string> = {
  template: i18n.TEMPLATE,
  title: i18n.TITLE,
  description: i18n.DESCRIPTION,
  severity: i18n.SEVERITY,
  category: i18n.CATEGORY,
  connector: i18n.CONNECTOR,
  tags: i18n.TAGS,
  assignees: i18n.ASSIGNEES,
};

/**
 * Template fields depend on the template the merged case gets. Until the user decides it, only
 * the global fields, which every template has, are shown and counted.
 */
export const isTemplateDecided = (
  { fields }: Pick<MergeCasesPreviewResponse, 'fields'>,
  choices: MergeFieldChoices
): boolean => !fields.template.hasConflict || choices.template !== undefined;

export const isExtendedFieldVisible = (
  field: Pick<MergeExtendedFieldPreview, 'isGlobal'>,
  templateDecided: boolean
): boolean => field.isGlobal || templateDecided;

export const getFieldLabel = (
  { fields }: Pick<MergeCasesPreviewResponse, 'fields'>,
  key: MergeFieldKey
): string => {
  if (key.startsWith(CUSTOM_PREFIX)) {
    const customKey = key.slice(CUSTOM_PREFIX.length);
    return fields.customFields.find((field) => field.key === customKey)?.label ?? customKey;
  }
  if (key.startsWith(EXTENDED_PREFIX)) {
    const extendedKey = key.slice(EXTENDED_PREFIX.length);
    return fields.extendedFields.find((field) => field.key === extendedKey)?.label ?? extendedKey;
  }
  return SINGLE_FIELD_LABELS[key as SingleRowField] ?? key;
};

const getFieldOrder = (
  { fields }: Pick<MergeCasesPreviewResponse, 'fields'>,
  key: MergeFieldKey
): number => {
  const singleIndex = SINGLE_ROW_FIELDS.indexOf(key as SingleRowField);
  if (singleIndex >= 0) {
    return singleIndex;
  }
  if (key.startsWith(CUSTOM_PREFIX)) {
    const index = fields.customFields.findIndex(
      (field) => field.key === key.slice(CUSTOM_PREFIX.length)
    );
    return 100 + Math.max(index, 0);
  }
  if (key.startsWith(EXTENDED_PREFIX)) {
    const index = fields.extendedFields.findIndex(
      (field) => field.key === key.slice(EXTENDED_PREFIX.length)
    );
    return 1000 + Math.max(index, 0);
  }
  return key === 'tags' ? 10000 : 10001;
};

const isConflictVisible = (
  preview: Pick<MergeCasesPreviewResponse, 'fields'>,
  conflict: MergeConflict,
  templateDecided: boolean
): boolean => {
  if (conflict.field !== 'extendedFields') {
    return true;
  }
  const row = preview.fields.extendedFields.find((field) => field.key === conflict.key);
  return row != null ? isExtendedFieldVisible(row, templateDecided) : templateDecided;
};

/** An "Other …" value the user cleared doesn't settle its field. */
const isEmptyChoice = (choices: MergeFieldChoices, key: MergeFieldKey): boolean => {
  if (key.startsWith(CUSTOM_PREFIX)) {
    const value = choices.customFields?.[key.slice(CUSTOM_PREFIX.length)]?.value;
    return value == null || (typeof value === 'string' && value.trim().length === 0);
  }
  if (key.startsWith(EXTENDED_PREFIX)) {
    const value = choices.extendedFields?.[key.slice(EXTENDED_PREFIX.length)];
    return value == null || value.trim().length === 0;
  }
  switch (key) {
    case 'title':
    case 'description':
      return (choices[key] ?? '').trim().length === 0;
    case 'category':
      return choices.category == null || choices.category.trim().length === 0;
    default:
      return false;
  }
};

/**
 * A field that differs is settled once the user picked a value. A required or invalid field also
 * needs the server to accept the value, so it stays open until the preview drops its conflict.
 */
const isConflictSettled = (
  conflict: MergeConflict,
  choices: MergeFieldChoices,
  needsReview: ReadonlySet<MergeFieldKey>
): boolean => {
  const key = getConflictKey(conflict);
  if (!hasFieldChoice(choices, key) || needsReview.has(key) || isEmptyChoice(choices, key)) {
    return false;
  }
  return conflict.reason === 'differentValues' || conflict.resolved;
};

const CONFLICT_STATE: Record<MergeConflict['reason'], BlockingStateKind> = {
  differentValues: 'chooseOne',
  invalidValue: 'invalid',
  required: 'required',
};

/** The issue the template has with the value the user picked for a custom or template field. */
export const getChosenOptionIssue = (
  { fields }: Pick<MergeCasesPreviewResponse, 'fields'>,
  choices: MergeFieldChoices,
  key: MergeFieldKey
): MergeOptionIssue | undefined => {
  if (key.startsWith(CUSTOM_PREFIX)) {
    const customKey = key.slice(CUSTOM_PREFIX.length);
    const chosen = choices.customFields?.[customKey];
    const row = fields.customFields.find((field) => field.key === customKey);
    return chosen != null
      ? row?.options.find(({ value }) => isEqual(value, chosen.value))?.invalid
      : undefined;
  }
  if (key.startsWith(EXTENDED_PREFIX)) {
    const extendedKey = key.slice(EXTENDED_PREFIX.length);
    const chosen = choices.extendedFields?.[extendedKey];
    const row = fields.extendedFields.find((field) => field.key === extendedKey);
    return chosen != null ? row?.options.find(({ value }) => value === chosen)?.invalid : undefined;
  }
  return undefined;
};

/** How many items each multi-value field is over its limit by, given the user's choices. */
export const getOverLimits = (
  { fields }: Pick<MergeCasesPreviewResponse, 'fields'>,
  choices: MergeFieldChoices
): { tags: number; assignees: number; description: number } => ({
  tags: Math.max(0, (choices.tags ?? fields.tags.value).length - fields.tags.max),
  assignees: fields.assignees.canChange
    ? Math.max(0, (choices.assignees ?? fields.assignees.value).length - fields.assignees.max)
    : 0,
  description:
    choices.description != null
      ? Math.max(0, choices.description.length - MAX_DESCRIPTION_LENGTH)
      : 0,
});

/** What the Differences step still needs before the user can move on. */
export const getDifferencesSummary = (
  preview: MergeCasesPreviewResponse,
  choices: MergeFieldChoices,
  needsReview: ReadonlySet<MergeFieldKey>
): DifferencesSummary => {
  const templateDecided = isTemplateDecided(preview, choices);
  const states = new Map<MergeFieldKey, BlockingStateKind | null>();
  const block = (key: MergeFieldKey, state: BlockingStateKind) => states.set(key, state);
  const touch = (key: MergeFieldKey) => {
    if (!states.has(key)) {
      states.set(key, null);
    }
  };

  for (const conflict of preview.conflicts.filter((item) =>
    isConflictVisible(preview, item, templateDecided)
  )) {
    const key = getConflictKey(conflict);
    if (isConflictSettled(conflict, choices, needsReview)) {
      touch(key);
    } else {
      block(key, CONFLICT_STATE[conflict.reason]);
    }
  }

  const chosenKeys: MergeFieldKey[] = [
    ...Object.keys(choices.customFields ?? {}).map(
      (key): MergeFieldKey => `${CUSTOM_PREFIX}${key}` as MergeFieldKey
    ),
    ...Object.keys(choices.extendedFields ?? {}).map(
      (key): MergeFieldKey => `${EXTENDED_PREFIX}${key}` as MergeFieldKey
    ),
  ];
  for (const key of chosenKeys) {
    if (getChosenOptionIssue(preview, choices, key) != null) {
      block(key, 'invalid');
    }
  }

  const overLimits = getOverLimits(preview, choices);
  if (overLimits.tags > 0) {
    block('tags', 'overLimit');
  }
  if (overLimits.assignees > 0) {
    block('assignees', 'overLimit');
  }
  if (overLimits.description > 0) {
    block('description', 'overLimit');
  }

  const blocking = [...states.entries()]
    .flatMap(([key, state]) =>
      state != null ? [{ key, label: getFieldLabel(preview, key), state }] : []
    )
    .sort((a, b) => getFieldOrder(preview, a.key) - getFieldOrder(preview, b.key));

  return { total: states.size, resolved: states.size - blocking.length, blocking };
};

/** The keys "Fill … from" sets: every field that differs, whether it is open or already set. */
export const getFillableKeys = (
  preview: MergeCasesPreviewResponse,
  choices: MergeFieldChoices
): MergeFieldKey[] => {
  const templateDecided = isTemplateDecided(preview, choices);
  return preview.conflicts
    .filter(
      (conflict) =>
        conflict.reason === 'differentValues' &&
        isConflictVisible(preview, conflict, templateDecided)
    )
    .map((conflict) => getConflictKey(conflict));
};

/**
 * The choices that take one case's values for every field that differs, replacing what is set. A
 * field the case has no value for, or a value the template rejects, keeps what it has.
 */
export const getFillFromCaseChoices = (
  preview: MergeCasesPreviewResponse,
  choices: MergeFieldChoices,
  caseId: string
): MergeFieldChoices => {
  const { fields } = preview;
  const filled: MergeFieldChoices = {};
  const customFields = { ...(choices.customFields ?? {}) };
  const extendedFields = { ...(choices.extendedFields ?? {}) };
  let hasCustom = false;
  let hasExtended = false;

  for (const key of getFillableKeys(preview, choices)) {
    if (key.startsWith(CUSTOM_PREFIX)) {
      const customKey = key.slice(CUSTOM_PREFIX.length);
      const row = fields.customFields.find((field) => field.key === customKey);
      const option = row?.options.find(
        ({ caseIds, invalid }) => caseIds.includes(caseId) && invalid == null
      );
      if (row != null && option != null) {
        customFields[customKey] = { type: row.type, value: option.value };
        hasCustom = true;
      }
    } else if (key.startsWith(EXTENDED_PREFIX)) {
      const extendedKey = key.slice(EXTENDED_PREFIX.length);
      const row = fields.extendedFields.find((field) => field.key === extendedKey);
      const option = row?.multiValue
        ? undefined
        : row?.options.find(({ caseIds, invalid }) => caseIds.includes(caseId) && invalid == null);
      if (option != null) {
        extendedFields[extendedKey] = option.value;
        hasExtended = true;
      }
    } else {
      switch (key) {
        case 'template': {
          const option = fields.template.options.find(
            ({ value, caseIds }) => caseIds.includes(caseId) && value?.isEnabled !== false
          );
          if (option != null) {
            filled.template = option.value;
          }
          break;
        }
        case 'title':
        case 'description':
        case 'category': {
          const option = fields[key].options.find(({ caseIds }) => caseIds.includes(caseId));
          if (option != null) {
            filled[key] = option.value as never;
          }
          break;
        }
        case 'severity': {
          const option = fields.severity.options.find(({ caseIds }) => caseIds.includes(caseId));
          if (option != null) {
            filled.severity = option.value;
          }
          break;
        }
        case 'connector': {
          const option = fields.connector.options.find(({ caseIds }) => caseIds.includes(caseId));
          if (option != null) {
            filled.connector = option.value;
          }
          break;
        }
        default:
          break;
      }
    }
  }

  return {
    ...filled,
    ...(hasCustom ? { customFields } : {}),
    ...(hasExtended ? { extendedFields } : {}),
  };
};

/** Parses a multi-value template field's stored JSON array; anything else is one value. */
export const parseMultiValue = (value: string): unknown[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};
