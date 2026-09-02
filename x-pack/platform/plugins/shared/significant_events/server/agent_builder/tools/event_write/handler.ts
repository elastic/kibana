/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';
import {
  type SignificantEvent,
  SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS,
} from '@kbn/significant-events-schema';
import type { EventClient } from '../../../lib/significant_events/events';
import {
  assertValidBulkWriteSize,
  createBulkWriteItemError,
  createBulkWriteOutcomeUnknownError,
  extractCreateResults,
  type CompactBulkError,
  toCompactBulkError,
} from '../bulk_write';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import { materializeSeverity } from '../../../lib/significant_events/events/severity_assessments';
import {
  addsNewDetectionRules,
  extractRuleUuids,
  extractRuleUuidsFromEvents,
  makeIdentity,
  mergeEpisodeContext,
  mergeSignalsLatestPerRule,
  preserveStableNarrative,
} from './episode_context';

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
  /** New assessments to append; the handler merges them with the stored assessment history. */
  severity_assessments?: SignificantEvent['severity_assessments'];
};

export interface EventsWriteResult {
  index: number;
  event_uuid: string;
  event_id: string;
  status: SignificantEvent['status'];
  severity: SignificantEvent['severity'];
  written: true;
  /** Set when the stored title and symptom_hypothesis were preserved because this continuation
   *  introduced no new rule UUIDs — preventing identity hijack by an unrelated condition. */
  narrative_preserved?: true;
}

export interface EventsWriteDuplicateResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  severity: SignificantEvent['severity'];
  written: false;
  skipped: true;
  reason: 'existing_active_event';
  existing_event_id: string;
}

export interface EventsWriteNoOpResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  severity: SignificantEvent['severity'];
  written: false;
  skipped: true;
  reason: 'unchanged_outcome';
}

export interface EventsWriteFailureResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  reason: 'bulk_error' | 'duplicate_in_batch';
  error: CompactBulkError;
}

interface DedupCandidate {
  mode: 'dedup';
  index: number;
  input: EventsWriteInput;
  eventId: string;
  eventUuid: string;
  /** Retained separately so the dedup scan can narrow by rule identity. */
  ruleUuids: string[];
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
  | EventsWriteNoOpResult
  | EventsWriteFailureResult;

/**
 * Returns true when the latest stored version for this event_id has the same severity and status
 * as the candidate and the candidate introduces no new detection rules — indicating this snapshot
 * would produce a pure-churn duplicate.
 * Must not call any esClient or eventClient method.
 */
const shouldSkipAsNoOp = (
  latestEvent: SignificantEvent | undefined,
  candidate: WriteCandidate,
  priorDocs: SignificantEvent[]
): boolean => {
  if (latestEvent === undefined) return false;

  const knownRuleUuids = extractRuleUuidsFromEvents([...priorDocs, latestEvent]);
  const addsRule = addsNewDetectionRules(extractRuleUuids(candidate.input.signals), knownRuleUuids);

  return (
    latestEvent.status === candidate.input.status &&
    latestEvent.severity === candidate.input.severity &&
    !addsRule
  );
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
    const normalizedEventId = normalizeEventId(input.event_id);
    if (normalizedEventId === undefined) {
      // No event_id → find-or-create: scan active events for identity match before writing.
      const ruleUuids = extractRuleUuids(input.signals);
      // Normalize event_id to undefined so fetchLatestByEventId does not attempt a lineage lookup.
      const normalizedInput = { ...input, event_id: undefined };
      return {
        mode: 'dedup',
        index,
        input: normalizedInput,
        eventId: uuidv4(),
        eventUuid: uuidv4(),
        ruleUuids,
      };
    }
    const normalizedInput = { ...input, event_id: normalizedEventId };
    return {
      mode: 'snapshot',
      index,
      input: normalizedInput,
      eventId: normalizedEventId,
      eventUuid: uuidv4(),
    };
  });

/**
 * Flags candidates that share an in-batch dedup identity (stream+rules exact-set match) or
 * event_id (snapshot mode) as `duplicate_in_batch` errors, keeping the first occurrence. Returns
 * the remainder.
 */
const markDuplicateKeys = (
  candidates: WriteCandidate[],
  results: BulkResults
): WriteCandidate[] => {
  const seenKeys = new Map<string, number>();

  for (const candidate of candidates) {
    const key =
      candidate.mode === 'dedup'
        ? makeIdentity({
            streamNames: candidate.input.stream_names,
            ruleUuids: candidate.ruleUuids,
          })
        : candidate.eventId;
    const firstIndex = seenKeys.get(key);

    if (firstIndex !== undefined) {
      const keyLabel =
        candidate.mode === 'dedup'
          ? `dedup identity ${JSON.stringify(key)}`
          : `event_id ${JSON.stringify(candidate.eventId)}`;

      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status: candidate.input.status,
        written: false,
        reason: 'duplicate_in_batch',
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

/** Single scan for dedup candidates: fetch all currently-active events for the batch. */
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
 * Returns true when the candidate's rule set is entirely contained in the active event's rule set
 * and at least one stream name is shared — meaning this detection is already tracked.
 *
 * Subset matching (not exact-set) handles co-detection noise: a candidate carrying rules [A]
 * correctly finds an active event with rules [A, B] rather than creating a duplicate. A new rule C
 * not present in any active event still produces a new event.
 *
 * Empty-rule candidates only match empty-rule events to avoid false-matching any event on stream
 * overlap alone.
 */
const isCoveredByActiveEvent = (
  candidate: DedupCandidate,
  ev: SignificantEvent,
  activeStatuses: readonly string[]
): boolean => {
  if (!activeStatuses.includes(ev.status)) return false;

  const candidateStreamSet = new Set(candidate.input.stream_names);
  const streamsOverlap = (ev.stream_names ?? []).some((s) => candidateStreamSet.has(s));
  if (!streamsOverlap) return false;

  const eventRuleUuids = extractRuleUuids(ev.signals);
  if (candidate.ruleUuids.length === 0) return eventRuleUuids.length === 0;

  const eventRuleSet = new Set(eventRuleUuids);
  return candidate.ruleUuids.every((uuid) => eventRuleSet.has(uuid));
};

/**
 * Marks dedup candidates whose rules are a subset of an active event's rules (with stream overlap)
 * as `existing_active_event` in `results`. Returns the candidates that still need to be written.
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
      const duplicate = activeEvents.find((ev) =>
        isCoveredByActiveEvent(candidate, ev, activeStatuses)
      );
      if (duplicate) {
        const existingEventId = duplicate.event_id ?? candidate.eventId;
        results[candidate.index] = {
          index: candidate.index,
          event_id: existingEventId,
          status: duplicate.status,
          severity: duplicate.severity,
          written: false,
          skipped: true,
          reason: 'existing_active_event',
          existing_event_id: existingEventId,
        };
        continue;
      }
    }
    toWrite.push(candidate);
  }

  return toWrite;
};

/** Full history for remaining continuation writes (lineage merge). */
const fetchPriorDocsByEventId = async (
  eventClient: EventClient,
  candidates: WriteCandidate[]
): Promise<{
  latestByEventId: Map<string, SignificantEvent>;
  priorDocsByEventId: Map<string, SignificantEvent[]>;
}> => {
  const latestByEventId = new Map<string, SignificantEvent>();
  const priorDocsByEventId = new Map<string, SignificantEvent[]>();
  await Promise.all(
    candidates
      .filter((c) => c.input.event_id !== undefined)
      .map(async (c) => {
        const { hits } = await eventClient.findByEventId(c.eventId);
        priorDocsByEventId.set(c.eventId, hits);
        const latest = hits.at(-1);
        if (latest !== undefined) {
          latestByEventId.set(c.eventId, latest);
        }
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
  const {
    event_id: _explicitId,
    severity_assessments: newSeverityAssessments = [],
    ...rest
  } = candidate.input;
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

  let severityAssessments = latestEvent?.severity_assessments;
  let severity = candidate.input.severity;
  if (newSeverityAssessments.length > 0) {
    severityAssessments = [...(severityAssessments ?? []), ...newSeverityAssessments];
    severity = materializeSeverity({
      assessments: severityAssessments,
      currentSeverity: latestEvent?.severity ?? candidate.input.severity,
      materializedAt: timestamp,
    });
  }

  // For continuations: if no new rule UUIDs are introduced, freeze title and symptom_hypothesis to
  // prevent identity hijack — the scenario where an unrelated condition's narrative replaces the
  // original event identity while the old rules are still listed in signals (#1082).
  const frozenNarrative = isContinuation
    ? preserveStableNarrative(
        extractRuleUuids(candidate.input.signals),
        latestEvent,
        extractRuleUuidsFromEvents([...priorDocs, latestEvent])
      )
    : undefined;

  return {
    candidate,
    status,
    narrativePreserved: frozenNarrative?.narrativePreserved,
    document: {
      ...rest,
      ...(frozenNarrative
        ? {
            title: frozenNarrative.title,
            ...(frozenNarrative.symptom_hypothesis !== undefined && {
              symptom_hypothesis: frozenNarrative.symptom_hypothesis,
            }),
          }
        : {}),
      '@timestamp': timestamp,
      event_uuid: candidate.eventUuid,
      event_id: candidate.eventId,
      previous_event_uuid: latestEvent?.event_uuid,
      investigations: latestEvent?.investigations,
      severity_assessments: severityAssessments,
      signals,
      stream_names: episodeContext.streamNames,
      causal_features: episodeContext.causalFeatures,
      blast_radius: episodeContext.blastRadius,
      severity,
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
  pendingWrites.forEach(({ candidate, status, narrativePreserved, document }, responseIndex) => {
    const detail = createResults[responseIndex];
    if (detail.error) {
      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status,
        written: false,
        reason: 'bulk_error',
        error: toCompactBulkError(detail),
      };
    } else {
      const result: EventsWriteResult = {
        index: candidate.index,
        event_uuid: candidate.eventUuid,
        event_id: candidate.eventId,
        status,
        severity: document.severity,
        written: true,
      };
      if (narrativePreserved) {
        result.narrative_preserved = true;
      }
      results[candidate.index] = result;
    }
  });
};

/**
 * Versions a batch of significant events in one request while preserving input order in the
 * returned results.
 *
 * Find-or-create items (no `event_id`):
 *  - Scan all currently-active events for one whose rules contain the candidate rules and whose
 *    streams overlap the candidate streams.
 *  - If found, skip the write and return the existing event_id (existing_active_event).
 *  - Otherwise write a new event with the caller-supplied status.
 *
 * Snapshot-mode items (`event_id` present):
 *  - Without a new severity assessment, skip the write (`unchanged_outcome`) when the latest
 *    stored version has the same severity and status, avoiding pure-churn duplicates.
 *  - Discovery-sourced writes always append an assessment and materialize the effective severity.
 *  - Otherwise write a new version of the identified event, persisting the caller-supplied status.
 *    Merges signals and topology with prior versions when history is found.
 *    When no new rule UUIDs are introduced, the stored `title` and `symptom_hypothesis` are
 *    preserved (`narrative_preserved: true` on the result) to prevent identity hijack.
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

  const candidates = buildWriteCandidates(inputs);
  const results: BulkResults = new Array(inputs.length);
  const validCandidates = markDuplicateKeys(candidates, results);

  const dedupCandidates = validCandidates.filter((c): c is DedupCandidate => c.mode === 'dedup');
  const activeEvents = await fetchActiveEventsForDedup(eventClient, dedupCandidates);
  const toWrite = resolveDedupSkips(validCandidates, activeEvents, results);

  const { latestByEventId, priorDocsByEventId } = await fetchPriorDocsByEventId(
    eventClient,
    toWrite
  );
  const remaining = toWrite.filter((candidate) => {
    if (
      candidate.mode === 'snapshot' &&
      (candidate.input.severity_assessments?.length ?? 0) === 0 &&
      shouldSkipAsNoOp(
        latestByEventId.get(candidate.eventId),
        candidate,
        priorDocsByEventId.get(candidate.eventId) ?? []
      )
    ) {
      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status: candidate.input.status,
        severity: latestByEventId.get(candidate.eventId)?.severity ?? candidate.input.severity,
        written: false,
        skipped: true,
        reason: 'unchanged_outcome',
      };
      return false;
    }
    return true;
  });

  if (remaining.length === 0) {
    return alignResults(results, 'Event bulk results were not aligned');
  }

  const pendingToWrite = remaining.map((candidate) =>
    buildPendingWrite(candidate, timestamp, latestByEventId, priorDocsByEventId)
  );

  let response;
  try {
    response = await eventClient.bulkCreate(
      pendingToWrite.map(({ document }) => document),
      // `wait_for` lets the immediate discovery `_count` see the newly written event version.
      { throwOnFail: false, refresh: 'wait_for' }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Elasticsearch transport error';
    throw createBulkWriteOutcomeUnknownError(`Event bulk write outcome is unknown: ${message}`);
  }

  const createResults = extractCreateResults(response, pendingToWrite.length, 'Event');
  applyBulkResults(pendingToWrite, createResults, results);

  // Notify subscribed workflows (fire-and-forget) for successfully written docs only: no prior
  // version -> created; a prior version with a different status (e.g. triage re-open) -> status
  // changed. Emission is best-effort and guarded, so it never affects the returned results.
  pendingToWrite.forEach(({ candidate, document }, responseIndex) => {
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

/**
 * Single-item adapter for callers that require thrown item errors (e.g. `event_create`).
 * Callers must supply `event_id` (snapshot mode). Find-or-create callers (no `event_id`) will
 * hit `existing_active_event`, which this adapter throws as `createBulkWriteOutcomeUnknownError`.
 */
export async function eventsWriteHandler({
  eventClient,
  input,
}: {
  eventClient: EventClient;
  input: EventsWriteInput;
}): Promise<EventsWriteResult | EventsWriteNoOpResult> {
  const [result] = await eventsWriteBulkHandler({ eventClient, inputs: [input] });
  if (result === undefined) {
    throw createBulkWriteOutcomeUnknownError('Event bulk write did not return a result');
  }
  if (!result.written) {
    if (result.reason === 'unchanged_outcome') {
      return result;
    }
    if ('skipped' in result) {
      throw createBulkWriteOutcomeUnknownError(
        `Event write skipped (existing active event): existing event_id=${result.existing_event_id}`
      );
    }
    throw createBulkWriteItemError(result.error);
  }
  return result;
}
