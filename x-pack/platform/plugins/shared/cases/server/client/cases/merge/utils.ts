/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import {
  FILE_ATTACHMENT_TYPE,
  MAX_ALERTS_PER_CASE,
  MAX_ASSIGNEES_PER_CASE,
  MAX_OBSERVABLES_PER_CASE,
  MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES,
  MAX_TAGS_PER_CASE,
} from '../../../../common/constants';
import type {
  AttachmentRequestV2,
  MergeAttachmentSummary,
  MergeCasesPreviewResponse,
  MergeFieldProvenance,
} from '../../../../common/types/api';
import type {
  AttachmentV2,
  Case,
  CaseCustomFields,
  CaseUserProfile,
  MergeCopiedTotals,
  UnifiedAttachmentPayload,
} from '../../../../common/types/domain';
import { CaseSeverity } from '../../../../common/types/domain';
import {
  isAlertAttachmentType,
  isCommentAttachmentType,
  isEventAttachmentType,
  isUnifiedReferenceAttachmentRequest,
} from '../../../../common/utils/attachments';
import { toUnifiedAttachmentPayload } from '../../../common/attachments';
import { isUnifiedPersistableStateOrExternalReference } from '../../../common/utils';

type CopiedKind = keyof MergeCopiedTotals;
type AttachmentKind = Exclude<CopiedKind, 'observables'> | 'files' | 'comments';

/** An attachment the merge creates on the destination, already stripped of duplicates. */
export interface MergeCopyItem {
  kind: Exclude<CopiedKind, 'observables'>;
  sourceCaseId: string;
  payload: UnifiedAttachmentPayload;
  /** Referenced items in the payload: alert or event ids, 1 for everything else. */
  itemCount: number;
}

export interface MergeAttachmentPlan {
  items: MergeCopyItem[];
  observables: Array<{ sourceCaseId: string; observable: Case['observables'][number] }>;
  summaries: Record<CopiedKind, MergeAttachmentSummary>;
  files: number;
  comments: number;
}

const SEVERITY_RANK: Record<CaseSeverity, number> = {
  [CaseSeverity.LOW]: 0,
  [CaseSeverity.MEDIUM]: 1,
  [CaseSeverity.HIGH]: 2,
  [CaseSeverity.CRITICAL]: 3,
};

/**
 * Orders cases the way merge reads them: an existing destination first, then the rest oldest first.
 * The first case that holds a value or an attachment is the one it's attributed to.
 */
export const orderCasesForMerge = (cases: Case[], destinationCaseId?: string): Case[] => {
  const byAge = [...cases].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  if (destinationCaseId == null) {
    return byAge;
  }
  const destination = byAge.find(({ id }) => id === destinationCaseId);
  return destination ? [destination, ...byAge.filter(({ id }) => id !== destinationCaseId)] : byAge;
};

interface ValueOption<T> {
  value: T;
  caseIds: string[];
}

const collectOptions = <T>(
  orderedCases: Case[],
  getValue: (theCase: Case) => T,
  isEmpty: (value: T) => boolean
): Array<ValueOption<T>> =>
  orderedCases.reduce<Array<ValueOption<T>>>((options, theCase) => {
    const value = getValue(theCase);
    if (isEmpty(value)) {
      return options;
    }
    const existing = options.find((option) => isEqual(option.value, value));
    if (existing) {
      existing.caseIds.push(theCase.id);
      return options;
    }
    return [...options, { value, caseIds: [theCase.id] }];
  }, []);

interface SingleValueFieldArgs<T> {
  orderedCases: Case[];
  destinationCaseId?: string;
  getValue: (theCase: Case) => T;
  isEmpty: (value: T) => boolean;
  emptyValue: T;
  /** Picks the default when values conflict and there's no existing destination. */
  pickConflictDefault?: (options: Array<ValueOption<T>>) => {
    option: ValueOption<T>;
    provenance: MergeFieldProvenance;
  };
}

/**
 * A conflict exists only when two or more cases have different non-empty values. Defaults: the
 * destination's value, else `pickConflictDefault`, else the oldest case's value.
 */
export const buildSingleValueField = <T>({
  orderedCases,
  destinationCaseId,
  getValue,
  isEmpty,
  emptyValue,
  pickConflictDefault,
}: SingleValueFieldArgs<T>) => {
  const options = collectOptions(orderedCases, getValue, isEmpty);

  if (options.length === 0) {
    return {
      value: emptyValue,
      provenance: 'none' as const,
      sourceCaseId: null,
      options,
      hasConflict: false,
    };
  }

  if (options.length === 1) {
    const [option] = options;
    return {
      value: option.value,
      provenance:
        option.caseIds.length === orderedCases.length ? ('same' as const) : ('only' as const),
      sourceCaseId: option.caseIds.length === 1 ? option.caseIds[0] : null,
      options,
      hasConflict: false,
    };
  }

  const destinationOption =
    destinationCaseId != null
      ? options.find((option) => option.caseIds.includes(destinationCaseId))
      : undefined;

  if (destinationOption != null && destinationCaseId != null) {
    return {
      value: destinationOption.value,
      provenance: 'destination' as const,
      sourceCaseId: destinationCaseId,
      options,
      hasConflict: true,
    };
  }

  const picked = pickConflictDefault?.(options) ?? {
    option: options[0],
    provenance: 'oldest' as const,
  };

  return {
    value: picked.option.value,
    provenance: picked.provenance,
    sourceCaseId: picked.option.caseIds[0],
    options,
    hasConflict: true,
  };
};

const combineValues = <T>(
  orderedCases: Case[],
  getValues: (theCase: Case) => T[],
  getKey: (value: T) => string,
  max: number
) => {
  const seen = new Set<string>();
  const combined: T[] = [];
  for (const theCase of orderedCases) {
    for (const value of getValues(theCase)) {
      const key = getKey(value);
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(value);
      }
    }
  }

  const keysPerCase = orderedCases.map((theCase) => getValues(theCase).map(getKey).sort());
  const allSame = keysPerCase.every((keys) => isEqual(keys, keysPerCase[0]));
  const provenance: MergeFieldProvenance =
    combined.length === 0 ? 'none' : allSame ? 'same' : 'combined';

  return { value: combined, provenance, max };
};

const isEmptyString = (value: string | null) => value == null || value.trim().length === 0;

export const buildFieldsPreview = (
  orderedCases: Case[],
  destinationCaseId?: string
): MergeCasesPreviewResponse['fields'] => ({
  title: buildSingleValueField({
    orderedCases,
    destinationCaseId,
    getValue: ({ title }) => title,
    isEmpty: isEmptyString,
    emptyValue: '',
  }),
  description: buildSingleValueField({
    orderedCases,
    destinationCaseId,
    getValue: ({ description }) => description,
    isEmpty: isEmptyString,
    emptyValue: '',
  }),
  severity: buildSingleValueField({
    orderedCases,
    destinationCaseId,
    getValue: ({ severity }) => severity,
    isEmpty: () => false,
    emptyValue: CaseSeverity.LOW,
    pickConflictDefault: (options) => ({
      option: options.reduce((highest, option) =>
        SEVERITY_RANK[option.value] > SEVERITY_RANK[highest.value] ? option : highest
      ),
      provenance: 'highest',
    }),
  }),
  category: buildSingleValueField<string | null>({
    orderedCases,
    destinationCaseId,
    getValue: ({ category }) => category ?? null,
    isEmpty: isEmptyString,
    emptyValue: null,
  }),
  tags: combineValues(
    orderedCases,
    ({ tags }) => tags,
    (tag) => tag,
    MAX_TAGS_PER_CASE
  ),
  assignees: combineValues<CaseUserProfile>(
    orderedCases,
    ({ assignees }) => assignees.map(({ uid }) => ({ uid })),
    ({ uid }) => uid,
    MAX_ASSIGNEES_PER_CASE
  ),
});

/**
 * Custom field values for the new case: per configured key, the first non-empty value in merge
 * order. Keys that aren't configured anymore are dropped so the create request stays valid.
 */
export const combineCustomFields = (
  orderedCases: Case[],
  configuredKeys: Set<string>
): CaseCustomFields => {
  const byKey = new Map<string, CaseCustomFields[number]>();
  for (const theCase of orderedCases) {
    for (const customField of theCase.customFields) {
      if (
        configuredKeys.has(customField.key) &&
        !byKey.has(customField.key) &&
        customField.value != null
      ) {
        byKey.set(customField.key, customField);
      }
    }
  }
  return [...byKey.values()];
};

/** Turns a stored attachment back into the payload that creates it. */
export const toCreatePayload = (attachment: AttachmentV2): UnifiedAttachmentPayload => {
  const {
    id: _id,
    version: _version,
    created_at: _createdAt,
    created_by: _createdBy,
    pushed_at: _pushedAt,
    pushed_by: _pushedBy,
    updated_at: _updatedAt,
    updated_by: _updatedBy,
    ...request
  } = attachment;
  return toUnifiedAttachmentPayload(request as AttachmentRequestV2);
};

const getAttachmentKind = (type: string): AttachmentKind => {
  if (isCommentAttachmentType(type)) {
    return 'comments';
  }
  if (type === FILE_ATTACHMENT_TYPE) {
    return 'files';
  }
  if (isAlertAttachmentType(type)) {
    return 'alerts';
  }
  if (isEventAttachmentType(type)) {
    return 'events';
  }
  return 'other';
};

const toStringArray = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

interface ReferencedItem {
  id: string;
  index: string | null;
}

/** Alert and event payloads can reference several documents; each one is deduped on its own. */
const getReferencedItems = (payload: UnifiedAttachmentPayload): ReferencedItem[] => {
  if (!isUnifiedReferenceAttachmentRequest(payload)) {
    return [];
  }
  const ids = toStringArray(payload.attachmentId);
  const metadataIndex = payload.metadata?.index;
  const indices = Array.isArray(metadataIndex)
    ? toStringArray(metadataIndex)
    : ids.map(() => (typeof metadataIndex === 'string' ? metadataIndex : null));
  return ids.map((id, position) => ({ id, index: indices[position] ?? null }));
};

const withReferencedItems = (
  payload: UnifiedAttachmentPayload,
  items: ReferencedItem[]
): UnifiedAttachmentPayload => {
  if (!isUnifiedReferenceAttachmentRequest(payload)) {
    return payload;
  }
  const ids = items.map(({ id }) => id);
  const indices = items.map(({ index }) => index).filter((index): index is string => index != null);
  const hasIndex = payload.metadata?.index != null;
  const isArray = Array.isArray(payload.attachmentId);
  return {
    ...payload,
    attachmentId: isArray ? ids : ids[0],
    ...(hasIndex
      ? { metadata: { ...payload.metadata, index: isArray ? indices : indices[0] } }
      : {}),
  };
};

const referencedItemKey = (type: string, { id, index }: ReferencedItem) =>
  `${type}|${id}|${index ?? ''}`;

/** Reference attachments other than alerts and events point at one object; value attachments are copied as they are. */
const otherAttachmentKey = (payload: UnifiedAttachmentPayload): string | null =>
  isUnifiedReferenceAttachmentRequest(payload)
    ? `${payload.type}|${toStringArray(payload.attachmentId).join(',')}`
    : null;

const emptySummary = (max: number | null): MergeAttachmentSummary => ({
  total: 0,
  duplicates: 0,
  toCopy: 0,
  existing: 0,
  max,
  overLimit: 0,
});

const withOverLimit = (
  summary: MergeAttachmentSummary,
  limitedCount = summary.existing + summary.toCopy
): MergeAttachmentSummary => ({
  ...summary,
  overLimit: summary.max == null ? 0 : Math.max(0, limitedCount - summary.max),
});

interface PlanState {
  summaries: Record<CopiedKind, MergeAttachmentSummary>;
  seen: Set<string>;
  items: MergeCopyItem[];
  observables: MergeAttachmentPlan['observables'];
  files: number;
  comments: number;
  /** Only persistable state and external references count toward the "other" limit. */
  limitedOther: number;
}

interface PlanEntryContext {
  state: PlanState;
  caseId: string;
  isDestination: boolean;
}

/** Records the key and reports whether the destination or an earlier case already held it. */
const markSeen = (seen: Set<string>, key: string): boolean => {
  const isDuplicate = seen.has(key);
  seen.add(key);
  return isDuplicate;
};

const addReferencedAttachment = (
  { state, caseId, isDestination }: PlanEntryContext,
  kind: 'alerts' | 'events',
  payload: UnifiedAttachmentPayload
) => {
  const summary = state.summaries[kind];
  const referenced = getReferencedItems(payload);
  const fresh = referenced.filter((item) => !markSeen(state.seen, referencedItemKey(kind, item)));

  if (isDestination) {
    summary.existing += referenced.length;
    return;
  }

  summary.total += referenced.length;
  summary.duplicates += referenced.length - fresh.length;
  summary.toCopy += fresh.length;
  if (fresh.length > 0) {
    state.items.push({
      kind,
      sourceCaseId: caseId,
      payload: withReferencedItems(payload, fresh),
      itemCount: fresh.length,
    });
  }
};

const addOtherAttachment = (
  { state, caseId, isDestination }: PlanEntryContext,
  payload: UnifiedAttachmentPayload
) => {
  const summary = state.summaries.other;
  const limitedCount = isUnifiedPersistableStateOrExternalReference(payload) ? 1 : 0;
  const key = otherAttachmentKey(payload);
  const isDuplicate = key != null && markSeen(state.seen, key);

  if (isDestination) {
    summary.existing += 1;
    state.limitedOther += limitedCount;
    return;
  }

  summary.total += 1;
  if (isDuplicate) {
    summary.duplicates += 1;
    return;
  }

  summary.toCopy += 1;
  state.limitedOther += limitedCount;
  state.items.push({ kind: 'other', sourceCaseId: caseId, payload, itemCount: 1 });
};

const addAttachment = (context: PlanEntryContext, attachment: AttachmentV2) => {
  const { state, isDestination } = context;
  const payload = toCreatePayload(attachment);
  const kind = getAttachmentKind(payload.type);
  const leftBehind = isDestination ? 0 : 1;

  switch (kind) {
    case 'files':
      state.files += leftBehind;
      break;
    case 'comments':
      state.comments += leftBehind;
      break;
    case 'alerts':
    case 'events':
      addReferencedAttachment(context, kind, payload);
      break;
    default:
      addOtherAttachment(context, payload);
  }
};

const addObservable = (
  { state, caseId, isDestination }: PlanEntryContext,
  observable: Case['observables'][number]
) => {
  const summary = state.summaries.observables;
  const isDuplicate = markSeen(state.seen, `observable|${observable.typeKey}|${observable.value}`);

  if (isDestination) {
    summary.existing += 1;
    return;
  }

  summary.total += 1;
  if (isDuplicate) {
    summary.duplicates += 1;
    return;
  }

  summary.toCopy += 1;
  state.observables.push({ sourceCaseId: caseId, observable });
};

interface BuildAttachmentPlanArgs {
  orderedCases: Case[];
  attachmentsByCaseId: Map<string, AttachmentV2[]>;
  destinationCaseId?: string;
}

/**
 * Decides what the merge copies: alerts and events per referenced document, other reference
 * attachments per referenced object, observables by type and value. Anything the destination or an
 * earlier case already holds is a duplicate. Files and comments are counted but never copied.
 */
export const buildAttachmentPlan = ({
  orderedCases,
  attachmentsByCaseId,
  destinationCaseId,
}: BuildAttachmentPlanArgs): MergeAttachmentPlan => {
  const state: PlanState = {
    summaries: {
      alerts: emptySummary(MAX_ALERTS_PER_CASE),
      events: emptySummary(null),
      observables: emptySummary(MAX_OBSERVABLES_PER_CASE),
      other: emptySummary(MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES),
    },
    seen: new Set<string>(),
    items: [],
    observables: [],
    files: 0,
    comments: 0,
    limitedOther: 0,
  };

  for (const theCase of orderedCases) {
    const context: PlanEntryContext = {
      state,
      caseId: theCase.id,
      isDestination: theCase.id === destinationCaseId,
    };
    for (const attachment of attachmentsByCaseId.get(theCase.id) ?? []) {
      addAttachment(context, attachment);
    }
    for (const observable of theCase.observables ?? []) {
      addObservable(context, observable);
    }
  }

  const { summaries, items, observables, files, comments, limitedOther } = state;

  return {
    items,
    observables,
    summaries: {
      alerts: withOverLimit(summaries.alerts),
      events: withOverLimit(summaries.events),
      observables: withOverLimit(summaries.observables),
      other: withOverLimit(summaries.other, limitedOther),
    },
    files,
    comments,
  };
};

/** Splits items into create requests without breaking the per-request attachment cap. */
export const chunkItems = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
};

export const emptyCopiedTotals = (): MergeCopiedTotals => ({
  alerts: 0,
  events: 0,
  observables: 0,
  other: 0,
});
