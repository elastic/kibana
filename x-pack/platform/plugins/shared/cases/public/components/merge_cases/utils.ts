/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n as kbnI18n } from '@kbn/i18n';
import {
  MAX_CASES_TO_MERGE,
  MAX_DESCRIPTION_LENGTH,
  MIN_CASES_TO_MERGE,
} from '../../../common/constants';
import type {
  MergeAttachmentChoices,
  MergeAttachmentSummary,
  MergeAttachmentsRequest,
  MergeCasesPreviewResponse,
  MergeCasesRequest,
  MergeConflict,
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

/** The latest destination a merged case links to, or `undefined` when it was never merged. */
export const getLatestDestinationId = (
  merge: CaseUI['merge'] | null | undefined
): string | undefined => {
  const mergedInto = merge?.mergedInto ?? [];
  return mergedInto.length > 0 ? mergedInto[mergedInto.length - 1] : undefined;
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

/** Returns the keys of every alert except the `count` most recently added to a case. */
export const getKeysOutsideNewest = (
  alerts: MergeAttachmentChoices['alerts'],
  count: number
): string[] =>
  alerts
    .map((alert, position) => ({ alert, position }))
    .sort(
      (first, second) =>
        second.alert.addedAt.localeCompare(first.alert.addedAt) || first.position - second.position
    )
    .slice(count)
    .map(({ alert }) => alert.key);

/** Applies the user's exclusions to the preview counts and limits. */
export const applyExclusions = (
  { attachments, choices }: Pick<MergeCasesPreviewResponse, 'attachments' | 'choices'>,
  excludedKeys: ReadonlySet<string>
): SelectedAttachments => {
  const alertsLeftWithAttacks =
    choices != null ? getAlertKeysLeftOutWithAttacks(choices, excludedKeys).size : 0;

  const summarize = (kind: MergeChoiceKind): SelectedAttachmentSummary => {
    const summary = attachments[kind];
    if (choices == null) {
      return { ...summary, excluded: 0 };
    }
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

export const getAttachmentsToCopyCount = (attachments: CopiedAttachmentSummaries): number =>
  MERGE_CHOICE_KINDS.reduce((count, kind) => count + attachments[kind].toCopy, 0);

/**
 * Sends, per kind, the shorter list: the items to leave out or the items to keep. Excluded keys the
 * preview no longer offers are dropped, so stale ones never reach the request.
 */
export const buildAttachmentsRequest = (
  choices: MergeAttachmentChoices | null,
  excludedKeys: ReadonlySet<string>
): MergeAttachmentsRequest | undefined => {
  if (choices == null) {
    return undefined;
  }

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
 * Blocking reasons
 */

const getLimitedKindReason = (attachments: CopiedAttachmentSummaries): string | undefined => {
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

const getConflictLabel = (conflict: MergeConflict): string => {
  switch (conflict.field) {
    case 'title':
      return i18n.TITLE_FIELD;
    case 'description':
      return i18n.DESCRIPTION_FIELD;
    case 'severity':
      return i18n.SEVERITY_FIELD;
    case 'category':
      return i18n.CATEGORY_FIELD;
    case 'connector':
      return i18n.CONNECTOR_FIELD;
    case 'template':
      return i18n.TEMPLATE_FIELD;
    default:
      return conflict.label ?? conflict.key ?? conflict.field;
  }
};

/** Returns the first reason the merge can't run, in the order the user resolves them. */
export const getMergeBlockingReason = ({
  caseCount,
  canChooseDestination,
  preview,
  attachments,
  values,
  unresolvedConflicts,
  includeAssignees,
}: {
  caseCount: number;
  /** False when the user can't create a case and no selected case is open. */
  canChooseDestination: boolean;
  preview: MergeCasesPreviewResponse;
  /** The preview counts after the user's exclusions. */
  attachments: CopiedAttachmentSummaries;
  values: MergeFieldValues;
  unresolvedConflicts: MergeConflict[];
  includeAssignees: boolean;
}): string | undefined => {
  const { fields } = preview;

  if (caseCount < MIN_CASES_TO_MERGE) {
    return i18n.BLOCKED_ADD_ANOTHER_CASE;
  }

  if (!canChooseDestination) {
    return i18n.BLOCKED_NO_DESTINATION;
  }

  if (values.title.trim().length === 0) {
    return i18n.BLOCKED_ENTER_TITLE;
  }

  if (values.description.trim().length === 0) {
    return i18n.BLOCKED_ENTER_DESCRIPTION;
  }

  if (values.description.length > MAX_DESCRIPTION_LENGTH) {
    return i18n.BLOCKED_SHORTEN_DESCRIPTION;
  }

  const valueConflicts = unresolvedConflicts.filter(({ reason }) => reason !== 'required');
  if (valueConflicts.length > 0) {
    return i18n.BLOCKED_RESOLVE_CONFLICTS(valueConflicts.length);
  }

  const [missingRequired] = unresolvedConflicts.filter(({ reason }) => reason === 'required');
  if (missingRequired != null) {
    return i18n.BLOCKED_FILL_IN_FIELD(getConflictLabel(missingRequired));
  }

  const limitedKindReason = getLimitedKindReason(attachments);
  if (limitedKindReason != null) {
    return limitedKindReason;
  }

  if (includeAssignees && values.assignees.length > fields.assignees.max) {
    return i18n.BLOCKED_TOO_MANY_ASSIGNEES(values.assignees.length - fields.assignees.max);
  }

  if (values.tags.length > fields.tags.max) {
    return i18n.BLOCKED_TOO_MANY_TAGS(values.tags.length - fields.tags.max);
  }

  return undefined;
};

export const buildMergeRequest = ({
  caseIds,
  destinationCaseId,
  choices,
  includeAssignees,
  closeSources,
  note,
  attachments,
}: {
  caseIds: string[];
  destinationCaseId?: string;
  choices: MergeFieldChoices;
  includeAssignees: boolean;
  closeSources: boolean;
  note: string | null;
  attachments?: MergeAttachmentsRequest;
}): MergeCasesRequest => {
  const trimmedNote = note?.trim() ?? '';
  const fields = buildMergeFields(choices, { includeAssignees });

  return {
    caseIds,
    ...(destinationCaseId != null ? { destinationCaseId } : {}),
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
    ...(attachments != null ? { attachments } : {}),
    closeSources,
    ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
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
