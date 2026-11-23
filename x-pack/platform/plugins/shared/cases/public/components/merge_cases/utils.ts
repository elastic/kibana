/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n as kbnI18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { MAX_CASES_TO_MERGE, MIN_CASES_TO_MERGE } from '../../../common/constants';
import type {
  MergeAttachmentChoices,
  MergeAttachmentSummary,
  MergeAttachmentsRequest,
  MergeCasesPreviewResponse,
  MergeCasesRequest,
  MergeCasesResolveResponse,
  MergeConflict,
  MergeExtendedFieldPreview,
  MergeFieldsRequest,
  MergePreviewCase,
  MergeTemplateOption,
} from '../../../common/types/api';
import type {
  CaseAssignees,
  CaseConnector,
  CaseSeverity,
  MergeCaseSnapshot,
} from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import type { CasesPermissions } from '../../../common';
import type { CaseUI } from '../../containers/types';
import * as i18n from './translations';
import type { DifferencesSummary } from './value_cards/field_state';

export type { DifferencesSummary };

type CaseReferenceSource = Pick<MergePreviewCase, 'title'> & { incrementalId?: number | null };

/** Returns how a case is named in merge copy: its number, or its title before it has one. */
export const getCaseReference = ({ incrementalId, title }: CaseReferenceSource): string =>
  incrementalId != null ? `#${incrementalId}` : title;

/** Joins case references the way the locale writes a list: "#118, #121 and #124". */
export const formatCaseList = (references: string[]): string => {
  try {
    return new Intl.ListFormat(kbnI18n.getLocale(), {
      style: 'long',
      type: 'conjunction',
    }).format(references);
  } catch {
    return references.join(', ');
  }
};

/**
 * Merging needs update and add-comment on the cases. Create is needed only for a new destination,
 * so a user without it can still merge into one of the open cases.
 */
export const canMergeCases = ({
  update,
  createComment,
}: Pick<CasesPermissions, 'update' | 'createComment'>): boolean => update && createComment;

/** Returns why the selected cases can't be merged, or `undefined` when they can. */
export const getMergeDisabledReason = (
  selectedCases: Array<Pick<CaseUI, 'owner'>>
): string | undefined => {
  if (selectedCases.length < MIN_CASES_TO_MERGE) {
    return i18n.DISABLED_TOO_FEW(MIN_CASES_TO_MERGE);
  }

  if (selectedCases.length > MAX_CASES_TO_MERGE) {
    return i18n.DISABLED_TOO_MANY(MAX_CASES_TO_MERGE);
  }

  if (new Set(selectedCases.map(({ owner }) => owner)).size > 1) {
    return i18n.DISABLED_MIXED_OWNERS;
  }

  return undefined;
};

/**
 * Field choices
 */

/** Where the cases go: a new case, or one of them. */
export type MergeInto = 'new' | 'existing';

export type CustomFieldValue = string | number | boolean | null;

export interface CustomFieldChoice {
  type: string;
  value: CustomFieldValue;
}

/**
 * The values the user picked, typed, combined or confirmed. A field is in here only once the user
 * acted on it; every other field takes the server's default.
 */
export interface MergeFieldChoices {
  title?: string;
  description?: string;
  severity?: CaseSeverity;
  category?: string | null;
  connector?: CaseConnector;
  template?: MergeTemplateOption | null;
  tags?: string[];
  assignees?: CaseAssignees;
  customFields?: Readonly<Record<string, CustomFieldChoice>>;
  extendedFields?: Readonly<Record<string, string>>;
}

export type MergeSingleFieldKey = Exclude<
  keyof MergeFieldChoices,
  'customFields' | 'extendedFields'
>;

export type MergeFieldKey =
  | MergeSingleFieldKey
  | `customFields.${string}`
  | `extendedFields.${string}`;

/** Names the field a conflict is about, so it can be matched to the user's choices. */
export const getConflictKey = ({
  field,
  key,
}: Pick<MergeConflict, 'field' | 'key'>): MergeFieldKey =>
  field === 'customFields' || field === 'extendedFields' ? `${field}.${key ?? ''}` : field;

const CUSTOM_FIELDS_PREFIX = 'customFields.';
const EXTENDED_FIELDS_PREFIX = 'extendedFields.';

export const hasFieldChoice = (choices: MergeFieldChoices, key: MergeFieldKey): boolean => {
  if (key.startsWith(CUSTOM_FIELDS_PREFIX)) {
    return choices.customFields?.[key.slice(CUSTOM_FIELDS_PREFIX.length)] !== undefined;
  }

  if (key.startsWith(EXTENDED_FIELDS_PREFIX)) {
    return choices.extendedFields?.[key.slice(EXTENDED_FIELDS_PREFIX.length)] !== undefined;
  }

  return Object.prototype.hasOwnProperty.call(choices, key);
};

const withoutEntry = <T>(
  record: Readonly<Record<string, T>> | undefined,
  key: string
): Record<string, T> =>
  Object.fromEntries(Object.entries(record ?? {}).filter(([entryKey]) => entryKey !== key));

const isSingleFieldKey = (key: MergeFieldKey): key is MergeSingleFieldKey =>
  !key.startsWith(CUSTOM_FIELDS_PREFIX) && !key.startsWith(EXTENDED_FIELDS_PREFIX);

/** The choices without the user's value for a field, so the field takes the server's default. */
export const withoutFieldChoice = (
  choices: MergeFieldChoices,
  key: MergeFieldKey
): MergeFieldChoices => {
  const next: MergeFieldChoices = { ...choices };
  if (isSingleFieldKey(key)) {
    delete next[key];
    return next;
  }

  if (key.startsWith(CUSTOM_FIELDS_PREFIX)) {
    const customFields = withoutEntry(choices.customFields, key.slice(CUSTOM_FIELDS_PREFIX.length));
    delete next.customFields;
    return Object.keys(customFields).length > 0 ? { ...next, customFields } : next;
  }

  const extendedFields = withoutEntry(
    choices.extendedFields,
    key.slice(EXTENDED_FIELDS_PREFIX.length)
  );
  delete next.extendedFields;
  return Object.keys(extendedFields).length > 0 ? { ...next, extendedFields } : next;
};

/** Every field the choices hold a value for. */
export const getChoiceKeys = (choices: MergeFieldChoices): MergeFieldKey[] => {
  const { customFields, extendedFields, ...singleFields } = choices;
  return [
    ...(Object.keys(singleFields) as MergeSingleFieldKey[]),
    ...Object.keys(customFields ?? {}).map((key): MergeFieldKey => `customFields.${key}`),
    ...Object.keys(extendedFields ?? {}).map((key): MergeFieldKey => `extendedFields.${key}`),
  ];
};

/**
 * A conflict is resolved once the user acted on its field. A value the template rejects, or an
 * empty required field, also needs the server to accept the value the user gave.
 */
export const isConflictResolved = (
  conflict: MergeConflict,
  choices: MergeFieldChoices,
  needsReview: ReadonlySet<MergeFieldKey>
): boolean => {
  const key = getConflictKey(conflict);
  if (!hasFieldChoice(choices, key) || needsReview.has(key)) {
    return false;
  }

  return conflict.reason === 'differentValues' || conflict.resolved;
};

export const getUnresolvedConflicts = (
  { conflicts }: Pick<MergeCasesPreviewResponse, 'conflicts'>,
  choices: MergeFieldChoices,
  needsReview: ReadonlySet<MergeFieldKey>
): MergeConflict[] =>
  conflicts.filter((conflict) => !isConflictResolved(conflict, choices, needsReview));

export interface MergeFieldValues {
  title: string;
  description: string;
  severity: CaseSeverity;
  category: string | null;
  connector: CaseConnector;
  template: MergeTemplateOption | null;
  tags: string[];
  assignees: CaseAssignees;
}

/** The values the destination gets: the user's choice, else the server's suggestion. */
export const getFieldValues = (
  { fields }: MergeCasesPreviewResponse,
  choices: MergeFieldChoices
): MergeFieldValues => ({
  title: choices.title ?? fields.title.value,
  description: choices.description ?? fields.description.value,
  severity: choices.severity ?? fields.severity.value,
  category: choices.category !== undefined ? choices.category : fields.category.value,
  connector: choices.connector ?? fields.connector.value,
  template: choices.template !== undefined ? choices.template : fields.template.value,
  tags: choices.tags ?? fields.tags.value,
  assignees: choices.assignees ?? fields.assignees.value,
});

/** Joins every distinct description under a heading naming the cases it comes from. */
export const combineDescriptions = ({ cases, fields }: MergeCasesPreviewResponse): string => {
  if (fields.description.combinedValue != null) {
    return fields.description.combinedValue;
  }

  const casesById = new Map(cases.map((theCase) => [theCase.id, theCase]));

  return fields.description.options
    .map(({ value, caseIds }) => {
      const references = caseIds.flatMap((caseId) => {
        const theCase = casesById.get(caseId);
        return theCase ? [getCaseReference(theCase)] : [];
      });
      return `**${i18n.COMBINED_DESCRIPTION_HEADING(references.join(', '))}**\n\n${value}`;
    })
    .join('\n\n---\n\n');
};

type RequestCustomField = NonNullable<MergeFieldsRequest['customFields']>[number];

const toRequestCustomField = (
  key: string,
  { type, value }: CustomFieldChoice
): RequestCustomField | null => {
  switch (type) {
    case CustomFieldTypes.TEXT:
      return {
        key,
        type: CustomFieldTypes.TEXT,
        value: typeof value === 'string' && value.length > 0 ? value : null,
      };
    case CustomFieldTypes.TOGGLE:
      return { key, type: CustomFieldTypes.TOGGLE, value: typeof value === 'boolean' && value };
    case CustomFieldTypes.NUMBER:
      return {
        key,
        type: CustomFieldTypes.NUMBER,
        value: typeof value === 'number' ? value : null,
      };
    default:
      return null;
  }
};

const toRequestCustomFields = (
  customFields: MergeFieldChoices['customFields']
): RequestCustomField[] | undefined => {
  if (customFields == null) {
    return undefined;
  }
  const requestFields = Object.entries(customFields).flatMap(([key, choice]) => {
    const requestField = toRequestCustomField(key, choice);
    return requestField != null ? [requestField] : [];
  });
  return requestFields.length > 0 ? requestFields : undefined;
};

/**
 * The choices the preview needs to evaluate the template's fields: the template itself, and the
 * custom and template field values it checks.
 */
export const buildPreviewFields = (choices: MergeFieldChoices): MergeFieldsRequest | undefined => {
  const customFields = toRequestCustomFields(choices.customFields);
  const extendedFields =
    choices.extendedFields != null && Object.keys(choices.extendedFields).length > 0
      ? { ...choices.extendedFields }
      : undefined;
  const fields: MergeFieldsRequest = {
    ...(choices.template !== undefined
      ? { template: choices.template != null ? { id: choices.template.id } : null }
      : {}),
    ...(customFields != null ? { customFields } : {}),
    ...(extendedFields != null ? { extendedFields } : {}),
  };
  return Object.keys(fields).length > 0 ? fields : undefined;
};

/** The fields the user acted on; everything else takes the server's default. */
export const buildMergeFields = (
  choices: MergeFieldChoices,
  { includeAssignees }: { includeAssignees: boolean }
): MergeFieldsRequest => ({
  ...(choices.title !== undefined ? { title: choices.title.trim() } : {}),
  ...(choices.description !== undefined ? { description: choices.description } : {}),
  ...(choices.severity !== undefined ? { severity: choices.severity } : {}),
  ...(choices.category !== undefined ? { category: choices.category } : {}),
  ...(choices.connector !== undefined ? { connector: choices.connector } : {}),
  ...(choices.tags !== undefined ? { tags: choices.tags } : {}),
  ...(includeAssignees && choices.assignees !== undefined ? { assignees: choices.assignees } : {}),
  ...buildPreviewFields(choices),
});

/**
 * The choices for the values the AI chose, the reverse of `buildMergeFields`. A template the cases
 * don't use is left out.
 */
export const toChoicesFromFields = (
  { fields: previewFields }: Pick<MergeCasesPreviewResponse, 'fields'>,
  fields: MergeFieldsRequest
): MergeFieldChoices => {
  const { template, customFields, extendedFields, ...singleFields } = fields;
  const templateOption =
    template != null
      ? previewFields.template.candidates.find(({ id }) => id === template.id)
      : undefined;
  const customChoices = Object.fromEntries(
    (customFields ?? []).map(({ key, type, value }): [string, CustomFieldChoice] => [
      key,
      { type, value },
    ])
  );

  return {
    ...singleFields,
    ...(template === null ? { template: null } : {}),
    ...(templateOption != null ? { template: templateOption } : {}),
    ...(Object.keys(customChoices).length > 0 ? { customFields: customChoices } : {}),
    ...(extendedFields != null && Object.keys(extendedFields).length > 0
      ? { extendedFields: { ...extendedFields } }
      : {}),
  };
};

/** The AI's reason for each field it chose, by field key. */
export const toAiReasons = (
  reasons: MergeCasesResolveResponse['reasons']
): ReadonlyMap<MergeFieldKey, string> =>
  new Map(reasons.map(({ field, key, reason }) => [getConflictKey({ field, key }), reason]));

/**
 * Attachments
 */

export type MergeChoiceKind = keyof MergeAttachmentChoices;
export type MergeChoice = MergeAttachmentChoices[MergeChoiceKind][number];

export const MERGE_CHOICE_KINDS: readonly MergeChoiceKind[] = [
  'alerts',
  'attacks',
  'events',
  'observables',
  'other',
] as const;

/** A preview summary after the user's exclusions. */
export type SelectedAttachmentSummary = MergeAttachmentSummary & { excluded: number };
export type SelectedAttachments = Omit<MergeCasesPreviewResponse['attachments'], MergeChoiceKind> &
  Record<MergeChoiceKind, SelectedAttachmentSummary>;

/** Returns the choices that count toward the kind's limit; events and attacks have none. */
export const getLimitedChoices = (
  choices: MergeAttachmentChoices,
  kind: MergeChoiceKind
): MergeChoice[] => {
  switch (kind) {
    case 'events':
    case 'attacks':
      return [];
    case 'other':
      return choices.other.filter(({ countsTowardLimit }) => countsTowardLimit);
    default:
      return choices[kind];
  }
};

/**
 * The alerts that leave with the attacks the user left out. An alert that a kept attack also
 * brings stays.
 */
export const getAlertKeysLeftOutWithAttacks = (
  choices: MergeAttachmentChoices,
  excludedKeys: ReadonlySet<string>
): Set<string> => {
  const kept = new Set<string>();
  const leftOut = new Set<string>();
  for (const { key, alertKeys } of choices.attacks) {
    const target = excludedKeys.has(key) ? leftOut : kept;
    alertKeys.forEach((alertKey) => target.add(alertKey));
  }
  kept.forEach((alertKey) => leftOut.delete(alertKey));
  return leftOut;
};

/** Returns how many standalone alerts fit, or `null` when alerts aren't over their limit. */
export const getRoomForAlerts = (
  summary: MergeAttachmentSummary,
  choices: MergeAttachmentChoices,
  excludedKeys: ReadonlySet<string>
): number | null => {
  if (summary.overBy <= 0) {
    return null;
  }
  const leftOutWithAttacks = getAlertKeysLeftOutWithAttacks(choices, excludedKeys).size;
  const overByAfterAttacks = Math.max(0, summary.overBy - leftOutWithAttacks);
  return Math.max(0, choices.alerts.length - overByAfterAttacks);
};

/** Returns how many limited items of the kind fit, or `null` when the kind isn't over its limit. */
export const getRoomForKind = (
  summary: MergeAttachmentSummary,
  choices: MergeAttachmentChoices,
  kind: MergeChoiceKind
): number | null =>
  summary.overBy > 0 ? Math.max(0, getLimitedChoices(choices, kind).length - summary.overBy) : null;

/** Returns the keys of every item except the `count` most recently added to a case. */
export const getKeysOutsideNewest = (
  items: ReadonlyArray<Pick<MergeChoice, 'key' | 'addedAt'>>,
  count: number
): string[] =>
  items
    .map((item, position) => ({ item, position }))
    .sort(
      (first, second) =>
        second.item.addedAt.localeCompare(first.item.addedAt) || first.position - second.position
    )
    .slice(count)
    .map(({ item }) => item.key);

export const LIMITED_CHOICE_KINDS = ['alerts', 'observables', 'other'] as const;
export type LimitedChoiceKind = (typeof LIMITED_CHOICE_KINDS)[number];

/**
 * Returns the exclusions that keep, of every given kind over its limit, the newest items that fit.
 * Attacks, kinds within their limits and items that don't count toward a limit keep the user's
 * choices.
 */
export const getExclusionsKeepingNewest = (
  { attachments, choices }: Pick<MergeCasesPreviewResponse, 'attachments' | 'choices'>,
  excludedKeys: ReadonlySet<string>,
  kinds: readonly LimitedChoiceKind[] = LIMITED_CHOICE_KINDS
): Set<string> => {
  const next = new Set(excludedKeys);
  for (const kind of kinds) {
    const room =
      kind === 'alerts'
        ? getRoomForAlerts(attachments.alerts, choices, excludedKeys)
        : getRoomForKind(attachments[kind], choices, kind);
    if (room != null) {
      const limited = getLimitedChoices(choices, kind);
      limited.forEach(({ key }) => next.delete(key));
      getKeysOutsideNewest(limited, room).forEach((key) => next.add(key));
    }
  }
  return next;
};

/** Applies the user's exclusions to the preview counts and limits. */
export const applyExclusions = (
  { attachments, choices }: Pick<MergeCasesPreviewResponse, 'attachments' | 'choices'>,
  excludedKeys: ReadonlySet<string>
): SelectedAttachments => {
  const alertsLeftWithAttacks = getAlertKeysLeftOutWithAttacks(choices, excludedKeys).size;

  const summarize = (kind: MergeChoiceKind): SelectedAttachmentSummary => {
    const summary = attachments[kind];
    const kindChoices: MergeChoice[] = choices[kind];
    const isExcluded = ({ key }: MergeChoice) => excludedKeys.has(key);
    const excludedItems = kindChoices.filter(isExcluded).length;
    const excludedLimited = getLimitedChoices(choices, kind).filter(isExcluded).length;
    const withAttacks = kind === 'alerts' ? alertsLeftWithAttacks : 0;
    return {
      ...summary,
      toCopy: Math.max(0, summary.toCopy - excludedItems - withAttacks),
      overBy: Math.max(0, summary.overBy - excludedLimited - withAttacks),
      excluded: excludedItems + withAttacks,
    };
  };

  return {
    ...attachments,
    alerts: summarize('alerts'),
    attacks: summarize('attacks'),
    events: summarize('events'),
    observables: summarize('observables'),
    other: summarize('other'),
  };
};

type CopiedAttachmentSummaries = Pick<SelectedAttachments, MergeChoiceKind>;

/**
 * Sends, per kind, the shorter list: the items to leave out or the items to keep. Excluded keys the
 * preview no longer offers are dropped, so stale ones never reach the request.
 */
export const buildAttachmentsRequest = (
  choices: MergeAttachmentChoices,
  excludedKeys: ReadonlySet<string>
): MergeAttachmentsRequest | undefined => {
  const request: MergeAttachmentsRequest = {};
  for (const kind of MERGE_CHOICE_KINDS) {
    const kindChoices: MergeChoice[] = choices[kind];
    const excluded = kindChoices.filter(({ key }) => excludedKeys.has(key)).map(({ key }) => key);
    const kept = kindChoices.filter(({ key }) => !excludedKeys.has(key)).map(({ key }) => key);
    if (excluded.length > 0) {
      request[kind] =
        excluded.length <= kept.length
          ? { mode: 'exclude', keys: excluded }
          : { mode: 'keep', keys: kept };
    }
  }

  return Object.keys(request).length > 0 ? request : undefined;
};

/**
 * Steps
 */

export type MergeStep = 'cases' | 'differences' | 'attachments' | 'review';

export const MERGE_STEPS: readonly MergeStep[] = [
  'cases',
  'differences',
  'attachments',
  'review',
] as const;

/** What each step needs before the user can move past it. */
export interface MergeStepState {
  /** Whether the user can't move past the step yet. */
  isBlocked: boolean;
  /** Why, for the footer; unset when the step itself shows what is left. */
  blocker?: string;
  /** Nothing to decide on the step, so Next passes it; it's still shown as done and can be opened. */
  isSkippable: boolean;
}

export type MergeStepStates = Record<MergeStep, MergeStepState>;

export const getCasesStepBlocker = ({
  caseCount,
  canChooseDestination,
  mergeInto,
  hasDestination,
}: {
  caseCount: number;
  /** False when the user can't create a case and no selected case is open. */
  canChooseDestination: boolean;
  mergeInto: MergeInto;
  hasDestination: boolean;
}): string | undefined => {
  if (caseCount < MIN_CASES_TO_MERGE) {
    return i18n.BLOCKED_ADD_ANOTHER_CASE;
  }

  if (!canChooseDestination) {
    return i18n.BLOCKED_NO_DESTINATION;
  }

  if (mergeInto === 'existing' && !hasDestination) {
    return i18n.BLOCKED_CHOOSE_CASE_TO_MERGE_INTO;
  }

  return undefined;
};

/** Why the Conflicts step is blocked; nothing while values are left to choose, which its bar counts. */
export const getDifferencesStepBlocker = ({ blocking }: DifferencesSummary): string | undefined => {
  const [first] = blocking;
  if (first == null || blocking.some(({ state }) => state === 'chooseOne')) {
    return undefined;
  }

  switch (first.state) {
    case 'required':
      return i18n.BLOCKED_FILL_IN_FIELD(first.label);
    case 'invalid':
      return i18n.BLOCKED_CHANGE_FIELD(first.label);
    default:
      return i18n.BLOCKED_FIX_LIMIT(first.label);
  }
};

export const getAttachmentsStepBlocker = (
  attachments: CopiedAttachmentSummaries
): string | undefined => {
  if (attachments.alerts.overBy > 0) {
    return i18n.BLOCKED_LEAVE_OUT_ALERTS(attachments.alerts.overBy);
  }

  if (attachments.observables.overBy > 0) {
    return i18n.BLOCKED_LEAVE_OUT_OBSERVABLES(attachments.observables.overBy);
  }

  if (attachments.other.overBy > 0) {
    return i18n.BLOCKED_LEAVE_OUT_OTHER(attachments.other.overBy);
  }

  return undefined;
};

/** The Differences step has nothing to decide when no field differs or needs a value. */
export const isDifferencesStepSkippable = ({ total, blocking }: DifferencesSummary): boolean =>
  total === 0 && blocking.length === 0;

/** The step Next opens: the next one with something to decide, else Review. */
export const getNextStep = (
  current: MergeStep,
  states: MergeStepStates
): { step: MergeStep; passed: MergeStep[] } => {
  const passed: MergeStep[] = [];
  for (const step of MERGE_STEPS.slice(MERGE_STEPS.indexOf(current) + 1)) {
    if (step === 'review' || !states[step].isSkippable) {
      return { step, passed };
    }
    passed.push(step);
  }
  return { step: 'review', passed };
};

/** The step Back opens: the previous one with something to decide, else Cases. */
export const getPreviousStep = (current: MergeStep, states: MergeStepStates): MergeStep => {
  const earlier = MERGE_STEPS.slice(0, MERGE_STEPS.indexOf(current)).reverse();
  return earlier.find((step) => step === 'cases' || !states[step].isSkippable) ?? 'cases';
};

/** A step can be opened once every step before it can be passed. */
export const canOpenStep = (step: MergeStep, states: MergeStepStates): boolean =>
  MERGE_STEPS.slice(0, MERGE_STEPS.indexOf(step)).every((earlier) => !states[earlier].isBlocked);

/** The first step that still blocks the merge, if any. */
export const getFirstBlockedStep = (states: MergeStepStates): MergeStep | undefined =>
  MERGE_STEPS.find((step) => states[step].isBlocked);

/**
 * The merged case, for Review
 */

/** Where a merged value comes from. */
export type MergedValueSource = 'cases' | 'own' | 'combined' | 'templateDefault' | 'none';

export interface MergedValue<T> {
  value: T;
  /** The cases that hold the value; empty when the user typed it or no case has one. */
  caseIds: string[];
  source: MergedValueSource;
}

interface SingleValueRow<T> {
  value: T;
  provenance: string;
  options: Array<{ value: T; caseIds: string[] }>;
}

const resolveSingleValue = <T>(row: SingleValueRow<T>, choice: T | undefined): MergedValue<T> => {
  const value = choice !== undefined ? choice : row.value;
  const option = row.options.find((candidate) => isEqual(candidate.value, value));
  if (option != null) {
    return { value, caseIds: option.caseIds, source: 'cases' };
  }
  if (choice !== undefined) {
    return { value, caseIds: [], source: 'own' };
  }
  return {
    value,
    caseIds: [],
    source: row.provenance === 'templateDefault' ? 'templateDefault' : 'none',
  };
};

export interface MergedTemplateField {
  key: string;
  label: string;
  value: string;
  caseIds: string[];
  source: MergedValueSource;
}

export interface MergedCustomField {
  key: string;
  label: string;
  value: CustomFieldValue;
  caseIds: string[];
  source: MergedValueSource;
}

export interface MergedCasePreview {
  title: MergedValue<string>;
  description: MergedValue<string>;
  severity: MergedValue<CaseSeverity>;
  category: MergedValue<string | null>;
  connector: MergedValue<CaseConnector>;
  template: MergedValue<MergeTemplateOption | null>;
  tags: string[];
  assignees: CaseAssignees;
  customFields: MergedCustomField[];
  extendedFields: MergedTemplateField[];
}

const isEmptyExtendedValue = (value: string | undefined): boolean =>
  value == null || value.length === 0 || value === '[]';

const resolveExtendedField = (
  row: MergeExtendedFieldPreview,
  choice: string | undefined
): MergedTemplateField => {
  const { value, caseIds, source } = resolveSingleValue(row, choice);
  return {
    key: row.key,
    label: row.label,
    value,
    caseIds: row.multiValue
      ? [...new Set((row.items ?? []).flatMap((item) => item.caseIds))]
      : caseIds,
    source: row.multiValue && choice === undefined ? 'cases' : source,
  };
};

/**
 * The values the new or existing case gets: the user's choice, else the value every case shares
 * (or the template's default). Only meaningful once every conflict has a choice.
 */
export const getMergedCasePreview = (
  preview: MergeCasesPreviewResponse,
  choices: MergeFieldChoices
): MergedCasePreview => {
  const { fields } = preview;
  const combined = combineDescriptions(preview);
  const description = resolveSingleValue(fields.description, choices.description);
  const isCombined = fields.description.options.length > 1 && description.value === combined;

  return {
    title: resolveSingleValue(fields.title, choices.title),
    description: isCombined
      ? {
          value: combined,
          caseIds: fields.description.options.flatMap(({ caseIds }) => caseIds),
          source: 'combined',
        }
      : description,
    severity: resolveSingleValue(fields.severity, choices.severity),
    category: resolveSingleValue(fields.category, choices.category),
    connector: resolveSingleValue(fields.connector, choices.connector),
    template: resolveSingleValue(
      { ...fields.template, options: fields.template.options },
      choices.template
    ),
    tags: choices.tags ?? fields.tags.value,
    assignees: choices.assignees ?? fields.assignees.value,
    customFields: fields.customFields
      .map((row) => {
        const resolved = resolveSingleValue(row, choices.customFields?.[row.key]?.value);
        return { key: row.key, label: row.label, ...resolved };
      })
      .filter(({ value }) => value != null && value !== ''),
    extendedFields: fields.extendedFields
      .map((row) => resolveExtendedField(row, choices.extendedFields?.[row.key]))
      .filter(({ value }) => !isEmptyExtendedValue(value)),
  };
};

/** Turns a stored template field value into text: JSON lists become comma-separated names. */
export const formatTemplateFieldValue = (value: string): string => {
  if (!value.startsWith('[')) {
    return value;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return value;
    }
    return parsed
      .map((item: unknown) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item != null && typeof item === 'object' && 'name' in item) {
          return String((item as { name: unknown }).name);
        }
        return String(item);
      })
      .join(', ');
  } catch {
    return value;
  }
};

/** Splits a list into what shows and what hides behind "Show N more": all of it fits up to `max`. */
export const splitOverflow = <T>(
  items: readonly T[],
  { max, visibleWhenOverflowing }: { max: number; visibleWhenOverflowing: number }
): { visible: T[]; hidden: T[] } =>
  items.length <= max
    ? { visible: [...items], hidden: [] }
    : {
        visible: items.slice(0, visibleWhenOverflowing),
        hidden: items.slice(visibleWhenOverflowing),
      };

export const buildMergeRequest = ({
  caseIds,
  destinationCaseId,
  choices,
  includeAssignees,
  closeSources,
  attachments,
}: {
  caseIds: string[];
  destinationCaseId?: string;
  choices: MergeFieldChoices;
  includeAssignees: boolean;
  closeSources: boolean;
  attachments?: MergeAttachmentsRequest;
}): MergeCasesRequest => {
  const fields = buildMergeFields(choices, { includeAssignees });

  return {
    caseIds,
    ...(destinationCaseId != null ? { destinationCaseId } : {}),
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
    ...(attachments != null ? { attachments } : {}),
    closeSources,
  };
};

/** A case snapshot for links and toasts. */
export const toCaseSnapshot = ({
  id,
  title,
  incrementalId,
}: Pick<MergePreviewCase, 'id' | 'title' | 'incrementalId'>): MergeCaseSnapshot => ({
  id,
  title,
  incrementalId,
});
