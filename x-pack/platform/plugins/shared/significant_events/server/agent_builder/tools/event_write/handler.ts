/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';
import {
  type BlastRadiusEntry,
  type CausalFeature,
  type SignificantEvent,
  type SignalEntry,
  SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS,
} from '@kbn/significant-events-schema';
import { resolveTimeBound } from '../../../lib/significant_events/latest_source_query';
import type { EventClient } from '../../../lib/significant_events/events';
import {
  assertValidBulkWriteSize,
  createBulkWriteItemError,
  createBulkWriteOutcomeUnknownError,
  createBulkWriteValidationError,
  extractCreateResults,
  type CompactBulkError,
  toCompactBulkError,
} from '../bulk_write';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';

/**
 * Input for writing a significant event document.
 *
 * Exactly one of `event_id` or `dedup_window` may be present per item — not both.
 *
 * - `dedup_window` present, `event_id` absent → dedup mode: scan for an active event with the
 *   same stream-and-rules fingerprint within the window; skip if found, otherwise create with
 *   the caller-supplied status.
 * - `event_id` present, `dedup_window` absent → continuation/snapshot mode: write a new version
 *   of the specified event, merging signals and topology with prior versions when found.
 * - Both absent → anonymous snapshot: generate a synthetic event_id, write as-is.
 *
 * `conversation_id` is the only addition not in the base schema — passed through for traceability.
 */
export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'status'
  | 'stream_names'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'severity'
  | 'confidence'
  | 'assessment_note'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'workflow_execution_id'
> & {
  event_id?: string;
  conversation_id?: string;
  dedup_window?: string;
};

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface EventsWriteResult {
  index: number;
  event_uuid: string;
  event_id: string;
  status: SignificantEvent['status'];
  written: true;
}

export interface EventsWriteDuplicateResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  skipped: true;
  reason: 'duplicate_within_window';
  existing_event_id: string;
}

export interface EventsWriteFailureResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  reason: 'bulk_error' | 'duplicate_key';
  error: CompactBulkError;
}

interface DedupCandidate {
  mode: 'dedup';
  index: number;
  input: EventsWriteInput;
  eventId: string;
  eventUuid: string;
  fingerprint: string;
  /** Retained separately from the fingerprint so the dedup scan can narrow by rule identity. */
  ruleUuids: string[];
  /** ISO string resolved from dedup_window — events older than this are ignored. */
  windowFrom: string;
}

interface SnapshotCandidate {
  mode: 'snapshot';
  index: number;
  input: EventsWriteInput;
  eventId: string;
  eventUuid: string;
}

type WriteCandidate = DedupCandidate | SnapshotCandidate;

export type EventsWriteBulkResult =
  | EventsWriteResult
  | EventsWriteDuplicateResult
  | EventsWriteFailureResult;

type EpisodeContextSource = Pick<SignificantEvent, '@timestamp'> &
  Partial<Pick<SignificantEvent, 'stream_names' | 'causal_features' | 'blast_radius'>>;

const normalizeChangePointType = (value: string | undefined): string => value ?? '';

const extractRuleUuids = (signals: SignalEntry[] | undefined): string[] => {
  const uuids = (signals ?? [])
    .filter((signal): signal is Extract<SignalEntry, { type: 'detection' }> =>
      Boolean(signal.type === 'detection' && signal.metadata.rule_uuid)
    )
    .map((signal) => signal.metadata.rule_uuid as string);
  return [...new Set(uuids)];
};

/**
 * Returns true when any submitted detection signal has a different `change_point_type` than the
 * candidate event's signal for the same rule UUID. A changed change-point type means the
 * alerting engine observed a new pattern (e.g. spike → dip) and the write represents a different
 * operational state — it must not be suppressed as a duplicate of the prior write.
 */
const hasChangedChangePointType = (
  submitted: SignalEntry[] | undefined,
  candidate: SignificantEvent
): boolean => {
  const submittedDetections = (submitted ?? []).filter(
    (s): s is Extract<SignalEntry, { type: 'detection' }> => s.type === 'detection'
  );
  const candidateByRule = new Map(
    (candidate.signals ?? [])
      .filter((s): s is Extract<SignalEntry, { type: 'detection' }> => s.type === 'detection')
      .map((s) => [s.metadata.rule_uuid, s])
  );

  return submittedDetections.some((s) => {
    const existing = candidateByRule.get(s.metadata.rule_uuid);
    if (!existing) return false;
    return (
      normalizeChangePointType(s.metadata.change_point_type) !==
      normalizeChangePointType(existing.metadata.change_point_type)
    );
  });
};

/** Stable stream-and-rules identity used only for duplicate detection within the configured window. */
export const makeFingerprint = (streamNames: string[], ruleUuids: string[]): string => {
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  return [primaryStream, ...[...ruleUuids].sort()].join('|');
};

const ruleUuidSetsEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((ruleUuid, index) => ruleUuid === sortedRight[index]);
};

/**
 * Compares dedup identities using the union of stream names so continuation-widened episodes
 * still match a new write that only carries a subset of the episode's streams.
 */
const dedupFingerprintsMatch = (
  candidateStreams: string[],
  candidateRuleUuids: string[],
  event: SignificantEvent
): boolean => {
  const eventStreams = event.stream_names ?? [];
  const eventRuleUuids = extractRuleUuids(event.signals);
  if (!ruleUuidSetsEqual(candidateRuleUuids, eventRuleUuids)) return false;

  const unionStreams = [...new Set([...eventStreams, ...candidateStreams])];
  const unionFingerprint = makeFingerprint(unionStreams, candidateRuleUuids);
  return (
    unionFingerprint === makeFingerprint(candidateStreams, candidateRuleUuids) ||
    unionFingerprint === makeFingerprint(eventStreams, eventRuleUuids)
  );
};

/**
 * In-batch dedup key: fingerprint plus per-rule change_point_type so distinct operational
 * states (e.g. spike vs dip) are not collapsed within the same events_write batch.
 */
const makeInBatchDedupKey = (fingerprint: string, signals: SignalEntry[] | undefined): string => {
  const ruleTypes = (signals ?? [])
    .filter((s): s is Extract<SignalEntry, { type: 'detection' }> => s.type === 'detection')
    .map((s) => `${s.metadata.rule_uuid}:${normalizeChangePointType(s.metadata.change_point_type)}`)
    .sort()
    .join(',');
  return `${fingerprint}|${ruleTypes}`;
};

/**
 * Per-incident event ID: a hash of the primary stream name, every detection rule UUID, and a
 * random UUID8 suffix. The suffix keeps distinct incidents for the same rules separate.
 * Deduplication uses `makeFingerprint` (stream and rules only), not this ID.
 */
export const generateDiscoveryEventId = (streamNames: string[], ruleUuids: string[]): string => {
  const suffix = uuidv4().replace(/-/g, '').slice(0, 8);
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  const basis = [primaryStream, ...[...ruleUuids].sort(), suffix].join('|');
  return createHash('sha256').update(basis).digest('hex').slice(0, 16);
};

const mergeLatestByKey = <T>(
  batches: Array<{ timestamp: string; values: T[] }>,
  getKey: (value: T) => string | undefined
): T[] => {
  const latest = new Map<string, { timestamp: string; value: T }>();

  for (const { timestamp, values } of batches) {
    for (const value of values) {
      const key = getKey(value);
      if (key === undefined) continue;
      const existing = latest.get(key);
      if (existing === undefined || timestamp >= existing.timestamp) {
        latest.set(key, { timestamp, value });
      }
    }
  }

  return [...latest.values()].map(({ value }) => value);
};

export const mergeSignalsLatestPerRule = (
  priorDocs: Array<Pick<SignificantEvent, '@timestamp' | 'signals'>>,
  submitted: SignalEntry[],
  submittedTimestamp: string
): SignalEntry[] =>
  mergeLatestByKey(
    [
      ...priorDocs.map((doc) => ({
        timestamp: doc['@timestamp'],
        values: doc.signals ?? [],
      })),
      { timestamp: submittedTimestamp, values: submitted },
    ],
    (signal) => (signal.type === 'detection' ? signal.metadata?.rule_uuid ?? undefined : undefined)
  );

export const mergeEpisodeContext = (
  priorDocs: EpisodeContextSource[],
  submitted: Omit<EpisodeContextSource, '@timestamp'> & {
    stream_names: SignificantEvent['stream_names'];
  },
  submittedTimestamp: string
): { streamNames: string[]; causalFeatures: CausalFeature[]; blastRadius: BlastRadiusEntry[] } => {
  const contexts: EpisodeContextSource[] = [
    ...priorDocs,
    { ...submitted, '@timestamp': submittedTimestamp },
  ];

  const streamNames = new Set(contexts.flatMap((ctx) => ctx.stream_names ?? []));
  const causal = new Map<string, { timestamp: string; entry: CausalFeature }>();
  const blast = new Map<string, { timestamp: string; entry: BlastRadiusEntry }>();

  for (const ctx of contexts) {
    const ts = ctx['@timestamp'];
    for (const entry of ctx.blast_radius ?? []) {
      const existing = blast.get(entry.feature_id);
      if (!existing || ts >= existing.timestamp)
        blast.set(entry.feature_id, { timestamp: ts, entry });
    }
    for (const entry of ctx.causal_features ?? []) {
      blast.delete(entry.feature_id);
      const existing = causal.get(entry.feature_id);
      if (!existing || ts >= existing.timestamp)
        causal.set(entry.feature_id, { timestamp: ts, entry });
    }
  }

  for (const id of causal.keys()) blast.delete(id);

  const byFeatureId = (
    a: { entry: { feature_id: string } },
    b: { entry: { feature_id: string } }
  ) => a.entry.feature_id.localeCompare(b.entry.feature_id);

  return {
    streamNames: [...streamNames].sort(),
    causalFeatures: [...causal.values()].sort(byFeatureId).map(({ entry }) => entry),
    blastRadius: [...blast.values()].sort(byFeatureId).map(({ entry }) => entry),
  };
};

type BulkResults = Array<EventsWriteBulkResult | undefined>;

/** Fills in every still-`undefined` slot or throws — every candidate must resolve to exactly one result. */
const alignResults = (results: BulkResults, message: string): EventsWriteBulkResult[] => {
  const aligned: EventsWriteBulkResult[] = [];
  for (const result of results) {
    if (result === undefined) {
      throw createBulkWriteOutcomeUnknownError(message);
    }
    aligned.push(result);
  }
  return aligned;
};

const normalizeEventId = (eventId: string | undefined): string | undefined =>
  eventId === '' ? undefined : eventId;

const buildWriteCandidates = (inputs: EventsWriteInput[]): WriteCandidate[] =>
  inputs.map((input, index) => {
    if (input.dedup_window !== undefined) {
      const ruleUuids = extractRuleUuids(input.signals);
      return {
        mode: 'dedup',
        index,
        input,
        eventId: generateDiscoveryEventId(input.stream_names, ruleUuids),
        eventUuid: uuidv4(),
        fingerprint: makeFingerprint(input.stream_names, ruleUuids),
        ruleUuids,
        windowFrom: resolveTimeBound(input.dedup_window),
      };
    }
    const normalizedInput = { ...input, event_id: normalizeEventId(input.event_id) };
    return {
      mode: 'snapshot',
      index,
      input: normalizedInput,
      eventId: normalizedInput.event_id ?? `agent-event-${uuidv4().slice(0, 8)}`,
      eventUuid: uuidv4(),
    };
  });

/**
 * Flags candidates that share an in-batch dedup identity (fingerprint + per-rule
 * change_point_type) or event_id (snapshot mode) as `duplicate_key` errors, keeping the first
 * occurrence. Returns the remainder.
 */
const markDuplicateKeys = (
  candidates: WriteCandidate[],
  results: BulkResults
): WriteCandidate[] => {
  const seenKeys = new Map<string, number>();

  for (const candidate of candidates) {
    const key =
      candidate.mode === 'dedup'
        ? makeInBatchDedupKey(candidate.fingerprint, candidate.input.signals)
        : candidate.eventId;
    const firstIndex = seenKeys.get(key);

    if (firstIndex !== undefined) {
      const keyLabel =
        candidate.mode === 'dedup'
          ? `dedup fingerprint ${JSON.stringify(candidate.fingerprint)}`
          : `event_id ${JSON.stringify(candidate.eventId)}`;

      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status: candidate.input.status,
        written: false,
        reason: 'duplicate_key',
        error: {
          type: 'validation_error',
          reason: `Duplicate ${keyLabel} at items[${firstIndex}] and items[${candidate.index}]`,
          status: 400,
        },
      };
    } else {
      seenKeys.set(key, candidate.index);
    }
  }

  return candidates.filter((c) => results[c.index] === undefined);
};

/** Single scan for dedup candidates: fetch all active events from the earliest window start. */
const fetchActiveEventsForDedup = async (
  eventClient: EventClient,
  dedupCandidates: DedupCandidate[]
): Promise<SignificantEvent[]> => {
  if (dedupCandidates.length === 0) return [];

  // Narrow by stream/rule only when every candidate carries one, otherwise an AND'd filter
  // could exclude a candidate's genuine duplicate that has no value for that field.
  const allCandidatesHaveStreamNames = dedupCandidates.every(
    (c) => c.input.stream_names.length > 0
  );
  const allCandidatesHaveRuleUuids = dedupCandidates.every((c) => c.ruleUuids.length > 0);
  const { hits } = await eventClient.findLatestActive({
    from: dedupCandidates.reduce((earliest, c) =>
      c.windowFrom < earliest.windowFrom ? c : earliest
    ).windowFrom,
    streamNames: allCandidatesHaveStreamNames
      ? [...new Set(dedupCandidates.flatMap((c) => c.input.stream_names))]
      : undefined,
    ruleUuids: allCandidatesHaveRuleUuids
      ? [...new Set(dedupCandidates.flatMap((c) => c.ruleUuids))]
      : undefined,
  });
  return hits;
};

/**
 * Marks dedup candidates whose fingerprint matches an in-window active event as
 * `duplicate_within_window` in `results`. Returns the candidates that still need to be written.
 */
const resolveDedupSkips = (
  validCandidates: WriteCandidate[],
  activeEvents: SignificantEvent[],
  results: BulkResults
): WriteCandidate[] => {
  const activeStatuses = SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS as readonly string[];
  const toWrite: WriteCandidate[] = [];

  for (const candidate of validCandidates) {
    if (candidate.mode === 'dedup') {
      const duplicate = activeEvents.find(
        (ev) =>
          activeStatuses.includes(ev.status) &&
          ev['@timestamp'] >= candidate.windowFrom &&
          dedupFingerprintsMatch(candidate.input.stream_names, candidate.ruleUuids, ev) &&
          !hasChangedChangePointType(candidate.input.signals, ev)
      );
      if (duplicate) {
        const existingEventId = duplicate.event_id ?? candidate.eventId;
        results[candidate.index] = {
          index: candidate.index,
          event_id: existingEventId,
          status: duplicate.status,
          written: false,
          skipped: true,
          reason: 'duplicate_within_window',
          existing_event_id: existingEventId,
        };
        continue;
      }
    }
    toWrite.push(candidate);
  }

  return toWrite;
};

/** Fetches prior versions needed for lineage (`previous_event_uuid`) and episode merge. */
const fetchLineageContext = async (
  eventClient: EventClient,
  toWrite: WriteCandidate[]
): Promise<{
  latestByEventId: Map<string, SignificantEvent>;
  priorDocsByEventId: Map<string, SignificantEvent[]>;
}> => {
  // For snapshot writes with an explicit event_id, fetch prior versions for lineage + episode merge.
  const explicitIds = toWrite.flatMap((c) => (c.input.event_id !== undefined ? [c.eventId] : []));
  const latestByEventId =
    explicitIds.length === 0
      ? new Map<string, SignificantEvent>()
      : await eventClient.findLatestByEventIds(explicitIds);

  // For continuation writes, fetch full history for episode merge.
  const priorDocsByEventId = new Map<string, SignificantEvent[]>();
  await Promise.all(
    toWrite
      .filter((c) => c.input.event_id !== undefined)
      .map(async (c) => {
        const { hits } = await eventClient.findByEventId(c.eventId);
        priorDocsByEventId.set(c.eventId, hits);
      })
  );

  return { latestByEventId, priorDocsByEventId };
};

const buildPendingWrite = (
  candidate: WriteCandidate,
  timestamp: string,
  latestByEventId: Map<string, SignificantEvent>,
  priorDocsByEventId: Map<string, SignificantEvent[]>
) => {
  const { dedup_window: _dedup, event_id: _explicitId, ...rest } = candidate.input;
  const priorDocs = priorDocsByEventId.get(candidate.eventId) ?? [];
  const latestEvent = latestByEventId.get(candidate.eventId);
  const isContinuation = candidate.input.event_id !== undefined;

  const signals = isContinuation
    ? mergeSignalsLatestPerRule(priorDocs, candidate.input.signals ?? [], timestamp)
    : candidate.input.signals ?? [];

  const episodeContext = isContinuation
    ? mergeEpisodeContext(priorDocs, rest, timestamp)
    : {
        streamNames: rest.stream_names,
        causalFeatures: rest.causal_features ?? [],
        blastRadius: rest.blast_radius ?? [],
      };

  // Discovery assigns the final status directly; persist caller-supplied status for all write modes.
  const status = candidate.input.status;

  return {
    candidate,
    status,
    document: {
      ...rest,
      '@timestamp': timestamp,
      event_uuid: candidate.eventUuid,
      event_id: candidate.eventId,
      previous_event_uuid: latestEvent?.event_uuid,
      investigations: latestEvent?.investigations,
      signals,
      stream_names: episodeContext.streamNames,
      causal_features: episodeContext.causalFeatures,
      blast_radius: episodeContext.blastRadius,
      severity: candidate.input.severity,
      status,
    },
  };
};

/** Writes `detail.error ? bulk_error : written` into `results` for each pending write, by index. */
const applyBulkResults = (
  pendingWrites: Array<ReturnType<typeof buildPendingWrite>>,
  createResults: BulkResponseItem[],
  results: BulkResults
): void => {
  pendingWrites.forEach(({ candidate, status }, responseIndex) => {
    const detail = createResults[responseIndex];
    results[candidate.index] = detail.error
      ? {
          index: candidate.index,
          event_id: candidate.eventId,
          status,
          written: false,
          reason: 'bulk_error',
          error: toCompactBulkError(detail),
        }
      : {
          index: candidate.index,
          event_uuid: candidate.eventUuid,
          event_id: candidate.eventId,
          status,
          written: true,
        };
  });
};

/**
 * Versions a batch of significant events in one request while preserving input order in the
 * returned results.
 *
 * Dedup-mode items (`dedup_window` present, no `event_id`):
 *  - Check for an active (status "open") event with the same fingerprint in-window and skip the
 *    write if found, returning the existing event_id.
 *  - Write with the caller-supplied status; discovery assigns the final status directly.
 *
 * Snapshot-mode items (`event_id` present, no `dedup_window`):
 *  - Write a new version of the identified event, persisting the caller-supplied status.
 *  - Merge signals and topology with prior versions when history is found.
 *
 * Anonymous items (neither `event_id` nor `dedup_window`):
 *  - Generate a synthetic event_id and write as-is.
 */
export async function eventsWriteBulkHandler({
  eventClient,
  inputs,
}: {
  eventClient: EventClient;
  inputs: EventsWriteInput[];
}): Promise<EventsWriteBulkResult[]> {
  const timestamp = new Date().toISOString();

  assertValidBulkWriteSize(inputs);

  // Defensive guard: the tool schema's `.refine()` already blocks this combination for normal
  // callers, but the handler must not silently discard `event_id` in favor of a generated one if
  // some other path (bypassing the schema) sends both fields.
  const mutuallyExclusiveViolations = inputs.flatMap((input, index) =>
    input.event_id !== undefined && input.dedup_window !== undefined ? [index] : []
  );
  if (mutuallyExclusiveViolations.length > 0) {
    throw createBulkWriteValidationError(
      `event_id and dedup_window are mutually exclusive at items[${mutuallyExclusiveViolations.join(
        ', '
      )}]`
    );
  }

  const candidates = buildWriteCandidates(inputs);
  const results: BulkResults = new Array(inputs.length);
  const validCandidates = markDuplicateKeys(candidates, results);

  const dedupCandidates = validCandidates.filter((c): c is DedupCandidate => c.mode === 'dedup');
  const activeEvents = await fetchActiveEventsForDedup(eventClient, dedupCandidates);
  const toWrite = resolveDedupSkips(validCandidates, activeEvents, results);

  const { latestByEventId, priorDocsByEventId } = await fetchLineageContext(eventClient, toWrite);
  const pendingWrites = toWrite.map((candidate) =>
    buildPendingWrite(candidate, timestamp, latestByEventId, priorDocsByEventId)
  );

  if (pendingWrites.length === 0) {
    return alignResults(results, 'Event bulk results were not aligned');
  }

  let response;
  try {
    response = await eventClient.bulkCreate(
      pendingWrites.map(({ document }) => document),
      // `wait_for` lets the immediate discovery `_count` see the newly written event version.
      { throwOnFail: false, refresh: 'wait_for' }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Elasticsearch transport error';
    throw createBulkWriteOutcomeUnknownError(`Event bulk write outcome is unknown: ${message}`);
  }

  const createResults = extractCreateResults(response, pendingWrites.length, 'Event');
  applyBulkResults(pendingWrites, createResults, results);

  // Notify subscribed workflows (fire-and-forget) for successfully written docs only: no prior
  // version -> created; a prior version with a different status (e.g. triage re-open) -> status
  // changed. Emission is best-effort and guarded, so it never affects the returned results.
  pendingWrites.forEach(({ candidate, document }, responseIndex) => {
    if (createResults[responseIndex].error) {
      return;
    }
    emitSignificantEventWriteTriggers({
      eventClient,
      significantEvent: document,
      priorSignificantEvent: latestByEventId.get(candidate.eventId),
    });
  });

  return alignResults(results, 'Event bulk results were not aligned with every input');
}

/** Single-item adapter retained for callers such as `event_create` that require thrown item errors. */
export async function eventsWriteHandler({
  eventClient,
  input,
}: {
  eventClient: EventClient;
  input: EventsWriteInput;
}): Promise<EventsWriteResult> {
  const [result] = await eventsWriteBulkHandler({ eventClient, inputs: [input] });
  if (result === undefined) {
    throw createBulkWriteOutcomeUnknownError('Event bulk write did not return a result');
  }
  if (!result.written) {
    if ('skipped' in result) {
      throw createBulkWriteOutcomeUnknownError(
        `Event write skipped (duplicate within window): existing event_id=${result.existing_event_id}`
      );
    }
    throw createBulkWriteItemError(result.error);
  }
  return result;
}
