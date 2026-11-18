/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FILE_ATTACHMENT_TYPE,
  MAX_ALERTS_PER_CASE,
  MAX_OBSERVABLES_PER_CASE,
  MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES,
} from '../../../../common/constants';
import type {
  AttachmentRequestV2,
  MergeAttachmentChoice,
  MergeAttachmentChoices,
  MergeAttachmentSummary,
  MergeAttachmentsRequest,
  MergeLimit,
  MergeNotCopiedReason,
} from '../../../../common/types/api';
import type {
  AttachmentV2,
  Case,
  MergeCounts,
  UnifiedAttachmentPayload,
} from '../../../../common/types/domain';
import {
  isAlertAttachmentType,
  isAttackAttachmentType,
  isCommentAttachmentType,
  isEventAttachmentType,
  isUnifiedReferenceAttachmentRequest,
} from '../../../../common/utils/attachments';
import { toUnifiedAttachmentPayload } from '../../../common/attachments';
import type { AlertInfo } from '../../../common/types';
import { isUnifiedPersistableStateOrExternalReference } from '../../../common/utils';
import type { AlertMergeIneligibility } from '../../../services/alerts';

export type MergeKind = keyof MergeCounts;
type CopiedKind = Exclude<MergeKind, 'observables'>;
type Observable = Case['observables'][number];

/** An attachment the merge creates on the destination, already stripped of duplicates. */
export interface MergeCopyItem {
  kind: CopiedKind;
  payload: UnifiedAttachmentPayload;
  /** Referenced documents in the payload: alert or event ids, 1 for everything else. */
  itemCount: number;
}

/** What the merge copies from one source case, and what it leaves there. */
export interface MergeSourcePlan {
  caseId: string;
  /** Attacks first, so the alerts they brought follow them. */
  items: MergeCopyItem[];
  observables: Observable[];
  toCopy: MergeCounts;
  existing: MergeCounts;
  leftOut: MergeCounts;
  /** Attachment ids the plan was built from, to find what the source gains during the merge. */
  attachmentIds: Set<string>;
  observableIds: Set<string>;
}

export interface MergeAttachmentPlan {
  /** Sources oldest first. */
  sources: MergeSourcePlan[];
  summaries: Record<MergeKind, MergeAttachmentSummary>;
  alertsByRule: Array<{ ruleId: string | null; ruleName: string | null; count: number }>;
  /** Every item the user could leave out, keyed for the request's `attachments`. */
  choices: MergeAttachmentChoices;
  limits: MergeLimit[];
  files: number;
  comments: number;
  /** Keys of everything the destination holds once the merge is done. */
  seenKeys: Set<string>;
}

interface ReferencedItem {
  id: string;
  index: string | null;
}

export const emptyCounts = (): MergeCounts => ({
  alerts: 0,
  events: 0,
  attacks: 0,
  observables: 0,
  other: 0,
});

const emptySummary = (max: number | null): MergeAttachmentSummary => ({
  total: 0,
  duplicates: 0,
  existing: 0,
  toCopy: 0,
  leftOut: 0,
  notCopied: [],
  max,
  overBy: 0,
});

/**
 * Orders cases the way merge reads them: an existing destination first, then the rest oldest
 * first. The first case that holds a value or an item is the one it's attributed to.
 */
export const orderCasesForMerge = (cases: Case[], destinationCaseId?: string): Case[] => {
  const byAge = [...cases].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const destination = byAge.find(({ id }) => id === destinationCaseId);
  return destination ? [destination, ...byAge.filter(({ id }) => id !== destinationCaseId)] : byAge;
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

/** Splits items into create requests without breaking the per-request attachment cap. */
export const chunkItems = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
};

type AttachmentKind = CopiedKind | 'files' | 'comments';

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
  if (isAttackAttachmentType(type)) {
    return 'attacks';
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

const getRule = (
  payload: UnifiedAttachmentPayload
): { ruleId: string | null; ruleName: string | null } => {
  const rule = isUnifiedReferenceAttachmentRequest(payload) ? payload.metadata?.rule : null;
  if (rule == null || typeof rule !== 'object' || Array.isArray(rule)) {
    return { ruleId: null, ruleName: null };
  }
  const { id, name } = rule as { id?: unknown; name?: unknown };
  return {
    ruleId: typeof id === 'string' ? id : null,
    ruleName: typeof name === 'string' ? name : null,
  };
};

/** The attacks that put these alerts on their case. */
const getSourceAttackIds = (payload: UnifiedAttachmentPayload): string[] =>
  isUnifiedReferenceAttachmentRequest(payload)
    ? toStringArray(payload.metadata?.sourceAttachmentIds)
    : [];

const getAttackTitle = (payload: UnifiedAttachmentPayload): string | null => {
  const title = isUnifiedReferenceAttachmentRequest(payload) ? payload.metadata?.title : null;
  return typeof title === 'string' ? title : null;
};

export const alertKey = (id: string) => `alerts|${id}`;
export const eventKey = (id: string) => `events|${id}`;
export const attackKey = (id: string) => `attacks|${id}`;
const observableValueKey = ({ typeKey, value }: Pick<Observable, 'typeKey' | 'value'>) =>
  `observable|${typeKey}|${value}`;
const observableChoiceKey = (caseId: string, observableId: string) =>
  `observables|${caseId}|${observableId}`;
const otherChoiceKey = (attachmentId: string) => `other|${attachmentId}`;

/** Reference attachments other than alerts and events point at one object; value attachments have no key. */
const otherDuplicateKey = (payload: UnifiedAttachmentPayload): string | null =>
  isUnifiedReferenceAttachmentRequest(payload)
    ? `${payload.type}|${toStringArray(payload.attachmentId).join(',')}`
    : null;

interface ParsedAttachment {
  attachment: AttachmentV2;
  payload: UnifiedAttachmentPayload;
  kind: AttachmentKind;
}

const parseAttachments = (attachments: AttachmentV2[]): ParsedAttachment[] =>
  attachments.map((attachment) => {
    const payload = toCreatePayload(attachment);
    return { attachment, payload, kind: getAttachmentKind(payload.type) };
  });

/**
 * The alerts each source would bring that the destination doesn't hold yet, and the alerts the
 * destination already holds. The merge checks both before it plans: the first for whether they
 * can be copied, the second for whether they list the destination.
 */
export const collectAlertsToCheck = ({
  orderedCases,
  attachmentsByCaseId,
  destinationCaseId,
}: {
  orderedCases: Case[];
  attachmentsByCaseId: Map<string, AttachmentV2[]>;
  destinationCaseId?: string;
}): { candidates: AlertInfo[]; linked: AlertInfo[] } => {
  const linked = new Map<string, AlertInfo>();
  const candidates = new Map<string, AlertInfo>();

  for (const theCase of orderedCases) {
    const isDestination = theCase.id === destinationCaseId;
    const alertAttachments = parseAttachments(attachmentsByCaseId.get(theCase.id) ?? []).filter(
      ({ kind }) => kind === 'alerts'
    );
    for (const { payload } of alertAttachments) {
      for (const { id, index } of getReferencedItems(payload)) {
        if (isDestination) {
          linked.set(id, { id, index: index ?? '' });
        } else if (!linked.has(id) && !candidates.has(id)) {
          candidates.set(id, { id, index: index ?? '' });
        }
      }
    }
  }

  const sourceAlertIds = new Set(
    orderedCases
      .filter(({ id }) => id !== destinationCaseId)
      .flatMap(({ id }) =>
        parseAttachments(attachmentsByCaseId.get(id) ?? [])
          .filter(({ kind }) => kind === 'alerts')
          .flatMap(({ payload }) => getReferencedItems(payload).map((item) => item.id))
      )
  );

  return {
    candidates: [...candidates.values()],
    // Only alerts the sources also bring: a rerun has to link those to the destination.
    linked: [...linked.values()].filter(({ id }) => sourceAlertIds.has(id)),
  };
};

/** Whether the request's choice for a kind keeps an item. `newest` is applied afterwards. */
const isKeptByChoice = (choice: MergeAttachmentChoice | undefined, key: string): boolean => {
  if (choice == null || choice.mode === 'newest') {
    return true;
  }
  return choice.mode === 'keep' ? choice.keys.includes(key) : !choice.keys.includes(key);
};

interface BuildAttachmentPlanArgs {
  orderedCases: Case[];
  attachmentsByCaseId: Map<string, AttachmentV2[]>;
  /** An existing destination; absent for a new case. */
  destinationCaseId?: string;
  choices?: MergeAttachmentsRequest;
  /** Alerts the merge leaves out on its own, by alert id. */
  ineligibleAlerts?: ReadonlyMap<string, AlertMergeIneligibility>;
  /** False below Platinum: observables are not copied. */
  copyObservables: boolean;
  /** Sources already linked to this destination. Their value attachments are not copied again. */
  alreadyMergedSourceIds?: ReadonlySet<string>;
}

interface AlertCandidate {
  key: string;
  addedAt: string;
  /** Attacks that brought the alert; empty when the analyst attached it. */
  attackIds: string[];
}

interface Unit {
  /** `alerts|…` for a standalone alert, `attacks|…` for an attack and the alerts it brought. */
  key: string;
  addedAt: string;
  size: number;
}

/**
 * Keeps the newest units that fit `room`, newest first, skipping units that don't fit. Returns
 * the keys left out.
 */
const leaveOutOldest = (units: Unit[], room: number): Set<string> => {
  const leftOut = new Set<string>();
  let used = 0;
  for (const unit of [...units].sort((a, b) => b.addedAt.localeCompare(a.addedAt))) {
    if (used + unit.size <= room) {
      used += unit.size;
    } else {
      leftOut.add(unit.key);
    }
  }
  return leftOut;
};

interface SourceAttachments {
  theCase: Case;
  parsed: ParsedAttachment[];
}

/** Shared state of one plan: what the destination will hold, and what the user can choose. */
interface PlanState {
  args: Required<Omit<BuildAttachmentPlanArgs, 'destinationCaseId'>>;
  summaries: Record<MergeKind, MergeAttachmentSummary>;
  choices: MergeAttachmentChoices;
  notCopied: Map<MergeKind, Map<MergeNotCopiedReason, number>>;
  seenKeys: Set<string>;
  alertsByRule: Map<string, { ruleId: string | null; ruleName: string | null; count: number }>;
  alertCandidates: Map<string, AlertCandidate>;
  /** Keys `newest` leaves out, for every kind. */
  leftOutByNewest: Set<string>;
  limitedOther: { existing: number; toCopy: number };
  files: number;
  comments: number;
}

const getAttackIds = (payload: UnifiedAttachmentPayload) =>
  isUnifiedReferenceAttachmentRequest(payload) ? toStringArray(payload.attachmentId) : [];

const addNotCopied = (state: PlanState, kind: MergeKind, reason: MergeNotCopiedReason) => {
  const byReason = state.notCopied.get(kind) ?? new Map<MergeNotCopiedReason, number>();
  byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  state.notCopied.set(kind, byReason);
};

const isAttackKept = (state: PlanState, attackId: string) =>
  isKeptByChoice(state.args.choices.attacks, attackKey(attackId)) &&
  !state.leftOutByNewest.has(attackKey(attackId));

const isKept = (state: PlanState, kind: 'alerts' | MergeOtherKind, key: string) =>
  isKeptByChoice(state.args.choices[kind], key) && !state.leftOutByNewest.has(key);

type MergeOtherKind = 'events' | 'observables' | 'other';

/** Records what an existing destination holds, so nothing is copied into it twice. */
const addDestinationHoldings = (state: PlanState, destination: SourceAttachments) => {
  const { summaries, seenKeys } = state;
  for (const { payload, kind } of destination.parsed) {
    if (kind === 'alerts' || kind === 'events') {
      const referenced = getReferencedItems(payload);
      summaries[kind].existing += referenced.length;
      referenced.forEach(({ id }) => seenKeys.add(kind === 'alerts' ? alertKey(id) : eventKey(id)));
    } else if (kind === 'attacks') {
      summaries.attacks.existing += 1;
      getAttackIds(payload).forEach((id) => seenKeys.add(attackKey(id)));
    } else if (kind === 'other') {
      summaries.other.existing += 1;
      state.limitedOther.existing += isUnifiedPersistableStateOrExternalReference(payload) ? 1 : 0;
      const key = otherDuplicateKey(payload);
      if (key != null) {
        seenKeys.add(key);
      }
    }
  }
  for (const observable of destination.theCase.observables ?? []) {
    summaries.observables.existing += 1;
    seenKeys.add(observableValueKey(observable));
  }
};

/**
 * Which attacks brought each alert, across every source, so an alert follows its attacks no
 * matter which source holds it. `null` marks an alert the analyst attached on its own.
 */
const getAlertAttackIds = (sources: SourceAttachments[]): Map<string, Set<string> | null> => {
  const attackAttachmentIds = new Set(
    sources.flatMap(({ parsed }) =>
      parsed
        .filter(({ kind }) => kind === 'attacks')
        .flatMap(({ payload }) => getAttackIds(payload))
    )
  );
  const alertAttackIds = new Map<string, Set<string> | null>();
  for (const { payload } of sources.flatMap(({ parsed }) =>
    parsed.filter(({ kind }) => kind === 'alerts')
  )) {
    const attackIds = getSourceAttackIds(payload).filter((id) => attackAttachmentIds.has(id));
    for (const { id } of getReferencedItems(payload)) {
      const current = alertAttackIds.get(id);
      alertAttackIds.set(
        id,
        attackIds.length === 0 || current === null
          ? null
          : new Set([...(current ?? []), ...attackIds])
      );
    }
  }
  return alertAttackIds;
};

/** The alerts and attacks the merge could copy, before any choice. */
const collectAlertCandidates = (state: PlanState, sources: SourceAttachments[]) => {
  const alertAttackIds = getAlertAttackIds(sources);
  const attacks = new Map<string, string>();
  for (const { attachment, payload, kind } of sources.flatMap(({ parsed }) => parsed)) {
    if (kind === 'attacks') {
      getAttackIds(payload)
        .filter((attackId) => !state.seenKeys.has(attackKey(attackId)) && !attacks.has(attackId))
        .forEach((attackId) => attacks.set(attackId, attachment.created_at));
    } else if (kind === 'alerts') {
      getReferencedItems(payload)
        .filter(
          ({ id }) =>
            !state.seenKeys.has(alertKey(id)) &&
            !state.alertCandidates.has(alertKey(id)) &&
            !state.args.ineligibleAlerts.has(id)
        )
        .forEach(({ id }) =>
          state.alertCandidates.set(alertKey(id), {
            key: alertKey(id),
            addedAt: attachment.created_at,
            attackIds: [...(alertAttackIds.get(id) ?? [])],
          })
        );
    }
  }
  return attacks;
};

/** Applies `newest`: alerts and attacks count against the alert limit as units. */
const applyNewest = (state: PlanState, sources: SourceAttachments[]) => {
  const { args, summaries, alertCandidates, leftOutByNewest } = state;
  const attacks = collectAlertCandidates(state, sources);

  if (args.choices.alerts?.mode === 'newest') {
    const candidates = [...alertCandidates.values()];
    const units: Unit[] = [
      ...candidates
        .filter(({ attackIds }) => attackIds.length === 0)
        .map(({ key, addedAt }) => ({ key, addedAt, size: 1 })),
      ...[...attacks]
        .filter(([attackId]) => isKeptByChoice(args.choices.attacks, attackKey(attackId)))
        .map(([attackId, addedAt]) => ({
          key: attackKey(attackId),
          addedAt,
          size: candidates.filter(({ attackIds }) => attackIds.includes(attackId)).length,
        })),
    ];
    leaveOutOldest(units, Math.max(0, MAX_ALERTS_PER_CASE - summaries.alerts.existing)).forEach(
      (key) => leftOutByNewest.add(key)
    );
  }

  const seen = new Set(state.seenKeys);
  const firstSeen = (key: string) => !seen.has(key) && Boolean(seen.add(key));
  const units: Record<MergeOtherKind, Unit[]> = { events: [], observables: [], other: [] };
  for (const { theCase, parsed } of sources) {
    for (const { attachment, payload, kind } of parsed) {
      const addedAt = attachment.created_at;
      if (kind === 'events') {
        getReferencedItems(payload)
          .filter(({ id }) => firstSeen(eventKey(id)))
          .forEach(({ id }) => units.events.push({ key: eventKey(id), addedAt, size: 1 }));
      } else if (kind === 'other') {
        const duplicateKey = otherDuplicateKey(payload);
        if (duplicateKey == null || firstSeen(duplicateKey)) {
          units.other.push({
            key: otherChoiceKey(attachment.id),
            addedAt,
            size: isUnifiedPersistableStateOrExternalReference(payload) ? 1 : 0,
          });
        }
      }
    }
    (theCase.observables ?? [])
      .filter((observable) => firstSeen(observableValueKey(observable)))
      .forEach(({ id, createdAt }) =>
        units.observables.push({
          key: observableChoiceKey(theCase.id, id),
          addedAt: createdAt,
          size: 1,
        })
      );
  }

  const rooms: Record<MergeOtherKind, number> = {
    events: Number.MAX_SAFE_INTEGER,
    observables: Math.max(0, MAX_OBSERVABLES_PER_CASE - summaries.observables.existing),
    other: Math.max(0, MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES - state.limitedOther.existing),
  };
  for (const kind of ['events', 'observables', 'other'] as const) {
    if (args.choices[kind]?.mode === 'newest') {
      leaveOutOldest(units[kind], rooms[kind]).forEach((key) => leftOutByNewest.add(key));
    }
  }
};

type Decision = 'existing' | 'leftOut' | 'copy';

/** Decides one alert of a source: already held, left out (by a check or a choice), or copied. */
const decideAlert = (
  state: PlanState,
  caseId: string,
  item: ReferencedItem,
  payload: UnifiedAttachmentPayload,
  addedAt: string
): Decision => {
  const key = alertKey(item.id);
  if (state.seenKeys.has(key)) {
    return 'existing';
  }
  state.seenKeys.add(key);

  const ineligibility = state.args.ineligibleAlerts.get(item.id);
  if (ineligibility != null) {
    addNotCopied(state, 'alerts', ineligibility);
    return 'leftOut';
  }

  const candidate = state.alertCandidates.get(key);
  const rule = getRule(payload);
  if (candidate != null && candidate.attackIds.length === 0) {
    state.choices.alerts.push({
      key,
      sourceCaseId: caseId,
      addedAt,
      alertId: item.id,
      index: item.index,
      ...rule,
    });
  }

  const kept =
    candidate != null &&
    (candidate.attackIds.length > 0
      ? candidate.attackIds.some((attackId) => isAttackKept(state, attackId))
      : isKept(state, 'alerts', key));
  if (!kept) {
    state.summaries.alerts.leftOut += 1;
    return 'leftOut';
  }

  const ruleKey = `${rule.ruleId ?? ''}|${rule.ruleName ?? ''}`;
  const byRule = state.alertsByRule.get(ruleKey) ?? { ...rule, count: 0 };
  byRule.count += 1;
  state.alertsByRule.set(ruleKey, byRule);
  return 'copy';
};

const decideEvent = (
  state: PlanState,
  caseId: string,
  item: ReferencedItem,
  addedAt: string
): Decision => {
  const key = eventKey(item.id);
  if (state.seenKeys.has(key)) {
    return 'existing';
  }
  state.seenKeys.add(key);
  state.choices.events.push({
    key,
    sourceCaseId: caseId,
    addedAt,
    eventId: item.id,
    index: item.index,
  });
  if (!isKept(state, 'events', key)) {
    state.summaries.events.leftOut += 1;
    return 'leftOut';
  }
  return 'copy';
};

/** Counts a decision on the source and returns whether the item is copied. */
const count = (source: MergeSourcePlan, kind: MergeKind, decision: Decision): boolean => {
  if (decision === 'existing') {
    source.existing[kind] += 1;
  } else if (decision === 'leftOut') {
    source.leftOut[kind] += 1;
  }
  return decision === 'copy';
};

const planReferenced = (
  state: PlanState,
  source: MergeSourcePlan,
  kind: 'alerts' | 'events',
  { attachment, payload }: ParsedAttachment
) => {
  const referenced = getReferencedItems(payload);
  state.summaries[kind].total += referenced.length;
  const included = referenced.filter((item) => {
    const decision =
      kind === 'alerts'
        ? decideAlert(state, source.caseId, item, payload, attachment.created_at)
        : decideEvent(state, source.caseId, item, attachment.created_at);
    if (decision === 'existing') {
      state.summaries[kind].duplicates += 1;
    }
    return count(source, kind, decision);
  });

  if (included.length > 0) {
    state.summaries[kind].toCopy += included.length;
    source.toCopy[kind] += included.length;
    source.items.push({
      kind,
      payload: withReferencedItems(payload, included),
      itemCount: included.length,
    });
  }
};

const decideAttack = (
  state: PlanState,
  caseId: string,
  { attachment, payload }: ParsedAttachment
): Decision => {
  const attackIds = getAttackIds(payload);
  if (attackIds.every((id) => state.seenKeys.has(attackKey(id)))) {
    return 'existing';
  }
  attackIds.forEach((id) => state.seenKeys.add(attackKey(id)));
  for (const attackId of attackIds) {
    state.choices.attacks.push({
      key: attackKey(attackId),
      sourceCaseId: caseId,
      addedAt: attachment.created_at,
      attackId,
      title: getAttackTitle(payload),
      alertKeys: [...state.alertCandidates.values()]
        .filter(({ attackIds: ids }) => ids.includes(attackId))
        .map(({ key }) => key),
    });
  }
  return attackIds.some((attackId) => isAttackKept(state, attackId)) ? 'copy' : 'leftOut';
};

const decideOther = (
  state: PlanState,
  caseId: string,
  { attachment, payload }: ParsedAttachment
): Decision => {
  const duplicateKey = otherDuplicateKey(payload);
  if (
    (duplicateKey != null && state.seenKeys.has(duplicateKey)) ||
    (duplicateKey == null && state.args.alreadyMergedSourceIds.has(caseId))
  ) {
    return 'existing';
  }
  if (duplicateKey != null) {
    state.seenKeys.add(duplicateKey);
  }
  const key = otherChoiceKey(attachment.id);
  state.choices.other.push({
    key,
    sourceCaseId: caseId,
    addedAt: attachment.created_at,
    type: payload.type,
    countsTowardLimit: isUnifiedPersistableStateOrExternalReference(payload),
  });
  return isKept(state, 'other', key) ? 'copy' : 'leftOut';
};

/** Plans a single-item attachment (an attack or another attachment) of a source. */
const planSingle = (
  state: PlanState,
  source: MergeSourcePlan,
  kind: 'attacks' | 'other',
  parsedAttachment: ParsedAttachment
): MergeCopyItem | undefined => {
  const summary = state.summaries[kind];
  summary.total += 1;
  const decision =
    kind === 'attacks'
      ? decideAttack(state, source.caseId, parsedAttachment)
      : decideOther(state, source.caseId, parsedAttachment);
  if (decision === 'existing') {
    summary.duplicates += 1;
  } else if (decision === 'leftOut') {
    summary.leftOut += 1;
  }
  if (!count(source, kind, decision)) {
    return undefined;
  }

  summary.toCopy += 1;
  source.toCopy[kind] += 1;
  if (kind === 'other' && isUnifiedPersistableStateOrExternalReference(parsedAttachment.payload)) {
    state.limitedOther.toCopy += 1;
  }
  return { kind, payload: parsedAttachment.payload, itemCount: 1 };
};

const decideObservable = (state: PlanState, caseId: string, observable: Observable): Decision => {
  const valueKey = observableValueKey(observable);
  if (state.seenKeys.has(valueKey)) {
    return 'existing';
  }
  state.seenKeys.add(valueKey);
  if (!state.args.copyObservables) {
    addNotCopied(state, 'observables', 'license');
    return 'leftOut';
  }
  const key = observableChoiceKey(caseId, observable.id);
  state.choices.observables.push({
    key,
    sourceCaseId: caseId,
    addedAt: observable.createdAt,
    typeKey: observable.typeKey,
    value: observable.value,
  });
  if (!isKept(state, 'observables', key)) {
    state.summaries.observables.leftOut += 1;
    return 'leftOut';
  }
  return 'copy';
};

const planSource = (state: PlanState, { theCase, parsed }: SourceAttachments): MergeSourcePlan => {
  const source: MergeSourcePlan = {
    caseId: theCase.id,
    items: [],
    observables: [],
    toCopy: emptyCounts(),
    existing: emptyCounts(),
    leftOut: emptyCounts(),
    attachmentIds: new Set(parsed.map(({ attachment }) => attachment.id)),
    observableIds: new Set((theCase.observables ?? []).map(({ id }) => id)),
  };
  const attackItems: MergeCopyItem[] = [];
  const otherItems: MergeCopyItem[] = [];

  for (const parsedAttachment of parsed) {
    const { kind } = parsedAttachment;
    if (kind === 'files') {
      state.files += 1;
    } else if (kind === 'comments') {
      state.comments += 1;
    } else if (kind === 'alerts' || kind === 'events') {
      planReferenced(state, source, kind, parsedAttachment);
    } else {
      const item = planSingle(state, source, kind, parsedAttachment);
      if (item != null) {
        (kind === 'attacks' ? attackItems : otherItems).push(item);
      }
    }
  }

  for (const observable of theCase.observables ?? []) {
    state.summaries.observables.total += 1;
    const decision = decideObservable(state, theCase.id, observable);
    if (decision === 'existing') {
      state.summaries.observables.duplicates += 1;
    }
    if (count(source, 'observables', decision)) {
      state.summaries.observables.toCopy += 1;
      source.toCopy.observables += 1;
      source.observables.push(observable);
    }
  }

  source.items = [...attackItems, ...source.items, ...otherItems];
  return source;
};

const getLimits = ({ summaries, limitedOther }: PlanState): MergeLimit[] => {
  const used: Record<'alerts' | 'observables' | 'other', number> = {
    alerts: summaries.alerts.existing + summaries.alerts.toCopy,
    observables: summaries.observables.existing + summaries.observables.toCopy,
    other: limitedOther.existing + limitedOther.toCopy,
  };
  return (['alerts', 'observables', 'other'] as const).flatMap((kind) => {
    const { max } = summaries[kind];
    const overBy = max == null ? 0 : Math.max(0, used[kind] - max);
    summaries[kind].overBy = overBy;
    return overBy > 0 && max != null ? [{ kind, max, total: used[kind], overBy }] : [];
  });
};

/**
 * Decides what the merge copies: alerts and events per referenced document, attacks with the
 * alerts they alone brought, other reference attachments per referenced object, observables by
 * type and value. Anything the destination or an earlier source already holds is a duplicate;
 * items the user, the alert checks or the license leave out stay where they are. Files and
 * comments are counted but never copied.
 */
export const buildAttachmentPlan = ({
  orderedCases,
  attachmentsByCaseId,
  destinationCaseId,
  choices = {},
  ineligibleAlerts = new Map(),
  copyObservables,
  alreadyMergedSourceIds = new Set(),
}: BuildAttachmentPlanArgs): MergeAttachmentPlan => {
  const state: PlanState = {
    args: {
      orderedCases,
      attachmentsByCaseId,
      choices,
      ineligibleAlerts,
      copyObservables,
      alreadyMergedSourceIds,
    },
    summaries: {
      alerts: emptySummary(MAX_ALERTS_PER_CASE),
      events: emptySummary(null),
      attacks: emptySummary(null),
      observables: emptySummary(MAX_OBSERVABLES_PER_CASE),
      other: emptySummary(MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES),
    },
    choices: { alerts: [], events: [], attacks: [], observables: [], other: [] },
    notCopied: new Map(),
    seenKeys: new Set(),
    alertsByRule: new Map(),
    alertCandidates: new Map(),
    leftOutByNewest: new Set(),
    limitedOther: { existing: 0, toCopy: 0 },
    files: 0,
    comments: 0,
  };

  const withAttachments = (theCase: Case): SourceAttachments => ({
    theCase,
    parsed: parseAttachments(attachmentsByCaseId.get(theCase.id) ?? []),
  });
  const destination = orderedCases.find(({ id }) => id === destinationCaseId);
  const sources = orderedCases.filter(({ id }) => id !== destinationCaseId).map(withAttachments);

  if (destination != null) {
    addDestinationHoldings(state, withAttachments(destination));
  }
  applyNewest(state, sources);
  const sourcePlans = sources.map((source) => planSource(state, source));

  for (const [kind, byReason] of state.notCopied) {
    state.summaries[kind].notCopied = [...byReason].map(([reason, total]) => ({
      reason,
      count: total,
    }));
  }

  return {
    sources: sourcePlans,
    summaries: state.summaries,
    alertsByRule: [...state.alertsByRule.values()],
    choices: state.choices,
    limits: getLimits(state),
    files: state.files,
    comments: state.comments,
    seenKeys: state.seenKeys,
  };
};

/**
 * Items a source gained after the plan was built, such as alerts a rule attached during the merge.
 * They are copied before the source is linked, unless the destination already holds them.
 */
export const planGainedItems = ({
  source,
  attachments,
  observables,
  seenKeys,
  copyObservables,
}: {
  source: MergeSourcePlan;
  attachments: AttachmentV2[];
  observables: Observable[];
  seenKeys: Set<string>;
  copyObservables: boolean;
}): {
  items: MergeCopyItem[];
  observables: Observable[];
  counts: MergeCounts;
  /** Everything the source gained, copied or not, so the next check doesn't see it again. */
  attachmentIds: string[];
  observableIds: string[];
} => {
  const items: MergeCopyItem[] = [];
  const counts = emptyCounts();
  const gainedAttachments = attachments.filter(({ id }) => !source.attachmentIds.has(id));
  const gained = parseAttachments(gainedAttachments);

  for (const { payload, kind } of gained) {
    if (kind === 'alerts' || kind === 'events') {
      const toKey = kind === 'alerts' ? alertKey : eventKey;
      const included = getReferencedItems(payload).filter(({ id }) => !seenKeys.has(toKey(id)));
      included.forEach(({ id }) => seenKeys.add(toKey(id)));
      if (included.length > 0) {
        items.push({
          kind,
          payload: withReferencedItems(payload, included),
          itemCount: included.length,
        });
        counts[kind] += included.length;
      }
    } else if (kind === 'attacks' || kind === 'other') {
      const duplicateKey =
        kind === 'attacks'
          ? attackKey(
              toStringArray(
                isUnifiedReferenceAttachmentRequest(payload) ? payload.attachmentId : []
              ).join(',')
            )
          : otherDuplicateKey(payload);
      if (duplicateKey == null || !seenKeys.has(duplicateKey)) {
        if (duplicateKey != null) {
          seenKeys.add(duplicateKey);
        }
        items.push({ kind, payload, itemCount: 1 });
        counts[kind] += 1;
      }
    }
  }

  const gainedObservables = copyObservables
    ? observables.filter(({ id, typeKey, value }) => {
        const valueKey = observableValueKey({ typeKey, value });
        if (source.observableIds.has(id) || seenKeys.has(valueKey)) {
          return false;
        }
        seenKeys.add(valueKey);
        return true;
      })
    : [];
  counts.observables = gainedObservables.length;

  return {
    items: [
      ...items.filter(({ kind }) => kind === 'attacks'),
      ...items.filter(({ kind }) => kind !== 'attacks'),
    ],
    observables: gainedObservables,
    counts,
    attachmentIds: gainedAttachments.map(({ id }) => id),
    observableIds: observables
      .filter(({ id }) => !source.observableIds.has(id))
      .map(({ id }) => id),
  };
};
