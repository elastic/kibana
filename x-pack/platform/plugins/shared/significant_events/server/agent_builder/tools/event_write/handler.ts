/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dateMath from '@kbn/datemath';
import {
  type BlastRadiusEntry,
  type CausalFeature,
  type SignificantEvent,
  type SignalEntry,
  SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS,
} from '@kbn/significant-events-schema';
import type { EventClient } from '../../../lib/significant_events/events';
import {
  assertUniqueBulkWriteKeys,
  assertValidBulkWriteSize,
  createBulkWriteItemError,
  createBulkWriteOutcomeUnknownError,
  extractCreateResults,
  type CompactBulkError,
  toCompactBulkError,
} from '../bulk_write';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Input for writing a significant event document.
 *
 * `event_id` is optional. When absent on a non-dedup write, a synthetic
 * ID is generated (`agent-event-<uuid8>`) and the latest-version lookup is skipped.
 *
 * `dedup_window` activates dedup mode for this item: the handler checks whether an active
 * (status == open) event with the same stream-and-rules fingerprint already exists within the
 * window and skips the write if so, returning the existing event_id. Omit it to preserve the
 * plain snapshot behaviour (caller-supplied status persisted as-is).
 *
 * `conversation_id` is the only addition not in the base schema — passed through for traceability.
 */
export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'discovery_id'
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
  /** Optional — generated as `agent-event-<uuid8>` when absent (snapshot writes without an explicit id). */
  event_id?: string;
  /** Not in the base SignificantEvent schema — passed through for traceability. */
  conversation_id?: string;
  /**
   * Discovery-mode deduplication window as an ES date math expression (e.g. "now-24h").
   * Present → dedup mode (dedup + episode merge + status forced to "pending").
   * Absent → snapshot mode (caller-supplied status persisted as-is).
   */
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
  reason: 'bulk_error';
  error: CompactBulkError;
}

export type EventsWriteBulkResult =
  | EventsWriteResult
  | EventsWriteDuplicateResult
  | EventsWriteFailureResult;

const extractRuleUuids = (signals: SignalEntry[] | undefined): string[] => {
  const uuids = (signals ?? [])
    .filter((signal): signal is Extract<SignalEntry, { type: 'detection' }> =>
      Boolean(signal.type === 'detection' && signal.metadata.rule_uuid)
    )
    .map((signal) => signal.metadata.rule_uuid as string);
  return [...new Set(uuids)];
};

/** Stable stream-and-rules identity used only for duplicate detection within the configured window. */
export const makeFingerprint = (streamNames: string[], ruleUuids: string[]): string => {
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  return [primaryStream, ...[...ruleUuids].sort()].join('|');
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

const isDateMathExpression = (value: string): boolean =>
  value.startsWith('now') || value.includes('||');

const parseDateMathToMs = (expr: string, now: Date): number | undefined => {
  if (!isDateMathExpression(expr)) return undefined;
  const parsed = dateMath.parse(expr, { forceNow: now });
  return parsed?.isValid() ? now.getTime() - parsed.valueOf() : undefined;
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

type EpisodeContextSource = Pick<SignificantEvent, '@timestamp'> &
  Partial<Pick<SignificantEvent, 'stream_names' | 'causal_features' | 'blast_radius'>>;

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

// ---------------------------------------------------------------------------
// Prepared-input shape
// ---------------------------------------------------------------------------

interface PreparedInput {
  index: number;
  input: EventsWriteInput;
  /** Epoch ms cutoff below which an active event blocks this write. Present only in discovery mode. */
  cutoffMs?: number;
  /** Stream-and-rules fingerprint for dedup. Present only in discovery mode. */
  fingerprint?: string;
  /** Resolved event ID — provided or generated. */
  eventId: string;
  eventUuid: string;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

/**
 * Versions a batch of significant events in one request while preserving input order in the
 * returned results.
 *
 * Dedup-mode items (dedup_window present) additionally:
 *  - check for an unresolved (status IN pending/open) event with the same fingerprint in-window and skip;
 *  - set status = "pending" — an unvalidated candidate hidden from the default read path;
 *  - merge signals and topology (stream_names, causal_features, blast_radius) with prior versions.
 *
 * Snapshot-mode items (dedup_window absent) retain today's behaviour and persist the
 * caller-supplied status (open/closed/dismissed).
 */
export async function eventsWriteBulkHandler({
  eventClient,
  inputs,
}: {
  eventClient: EventClient;
  inputs: EventsWriteInput[];
}): Promise<EventsWriteBulkResult[]> {
  const now = new Date();

  assertValidBulkWriteSize(inputs);
  assertUniqueBulkWriteKeys(
    inputs.flatMap((input, index) =>
      input.event_id === undefined ? [] : [{ index, key: input.event_id }]
    ),
    'event_id'
  );

  // Pre-compute fingerprints and cutoffs for discovery-mode items.
  const prepared: PreparedInput[] = inputs.map((input, index) => {
    const isDiscoveryMode = input.dedup_window !== undefined && input.event_id === undefined;
    const windowMs =
      isDiscoveryMode && input.dedup_window
        ? parseDateMathToMs(input.dedup_window, now)
        : undefined;
    const fingerprint =
      isDiscoveryMode && windowMs !== undefined
        ? makeFingerprint(input.stream_names, extractRuleUuids(input.signals))
        : undefined;

    const ruleUuids = extractRuleUuids(input.signals);
    const eventId =
      input.event_id ??
      (isDiscoveryMode
        ? generateDiscoveryEventId(input.stream_names, ruleUuids)
        : `agent-event-${uuidv4().slice(0, 8)}`);

    return {
      index,
      input,
      cutoffMs: isDiscoveryMode && windowMs !== undefined ? now.getTime() - windowMs : undefined,
      fingerprint,
      eventId,
      eventUuid: uuidv4(),
    };
  });

  // Validate that no two discovery-mode items share the same fingerprint.
  assertUniqueBulkWriteKeys(
    prepared.flatMap(({ index, fingerprint }) =>
      fingerprint === undefined ? [] : [{ index, key: fingerprint }]
    ),
    'discovery fingerprint'
  );

  // Single scan for dedup candidates: fetch active (status == open) events from the earliest cutoff.
  const cutoffs = prepared.flatMap(({ cutoffMs }) => (cutoffMs !== undefined ? [cutoffMs] : []));
  const activeEvents: SignificantEvent[] =
    cutoffs.length === 0
      ? []
      : (await eventClient.findLatestActiveFrom(new Date(Math.min(...cutoffs)).toISOString())).hits;

  const results: Array<EventsWriteBulkResult | undefined> = new Array(inputs.length);
  const toWrite: PreparedInput[] = [];

  for (const item of prepared) {
    if (item.fingerprint !== undefined && item.cutoffMs !== undefined) {
      // Dedup: look for an unresolved event (pending candidate or open event)
      // with the same fingerprint in-window. `findLatestActiveFrom` already restricts to the
      // active statuses; this guards defensively against any status leaking through.
      const activeStatuses = SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS as readonly string[];
      const duplicate = activeEvents.find(
        (ev) =>
          activeStatuses.includes(ev.status) &&
          Date.parse(ev['@timestamp']) >= (item.cutoffMs as number) &&
          makeFingerprint(ev.stream_names ?? [], extractRuleUuids(ev.signals)) === item.fingerprint
      );
      if (duplicate) {
        const existingEventId = duplicate.event_id ?? item.eventId;
        results[item.index] = {
          index: item.index,
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
    toWrite.push(item);
  }

  // For continuation writes (explicit event_id in discovery mode) and snapshot-mode explicit IDs,
  // fetch prior versions for lineage + episode merge.
  const explicitIds = toWrite.flatMap(({ input, eventId }) =>
    input.event_id !== undefined || input.dedup_window !== undefined ? [eventId] : []
  );
  const latestByEventId =
    explicitIds.length === 0
      ? new Map<string, SignificantEvent>()
      : await eventClient.findLatestByEventIds(explicitIds);

  // For discovery-mode continuations, fetch full history for episode merge.
  const priorDocsByEventId = new Map<string, SignificantEvent[]>();
  await Promise.all(
    toWrite
      .filter(({ input }) => input.event_id !== undefined && input.dedup_window !== undefined)
      .map(async ({ eventId }) => {
        const { hits } = await eventClient.findByEventId(eventId);
        priorDocsByEventId.set(eventId, hits);
      })
  );

  const timestamp = now.toISOString();

  const pendingWrites = toWrite.map((item) => {
    const { dedup_window: _dedup, event_id: _explicitId, ...rest } = item.input;
    const isDiscoveryMode = item.input.dedup_window !== undefined;
    const isContinuation = item.input.event_id !== undefined && isDiscoveryMode;
    const priorDocs = priorDocsByEventId.get(item.eventId) ?? [];
    const latestEvent = latestByEventId.get(item.eventId);

    const signals = isContinuation
      ? mergeSignalsLatestPerRule(priorDocs, item.input.signals ?? [], timestamp)
      : item.input.signals ?? [];

    const episodeContext = isContinuation
      ? mergeEpisodeContext(priorDocs, rest, timestamp)
      : {
          streamNames: rest.stream_names,
          causalFeatures: rest.causal_features ?? [],
          blastRadius: rest.blast_radius ?? [],
        };

    // Dedup writes (dedup_window present, incl. continuations) land as "pending" candidates;
    // snapshot writes persist the caller-supplied status.
    const status = isDiscoveryMode ? ('pending' as const) : item.input.status;

    return {
      item,
      status,
      document: {
        ...rest,
        '@timestamp': timestamp,
        event_uuid: item.eventUuid,
        event_id: item.eventId,
        previous_event_uuid: latestEvent?.event_uuid,
        investigations: latestEvent?.investigations,
        signals,
        stream_names: episodeContext.streamNames,
        causal_features: episodeContext.causalFeatures,
        blast_radius: episodeContext.blastRadius,
        severity: item.input.severity,
        status,
      },
    };
  });

  if (pendingWrites.length === 0) {
    // All items were deduplicated — return early without an ES round-trip.
    const aligned: EventsWriteBulkResult[] = [];
    for (const result of results) {
      if (result === undefined) {
        throw createBulkWriteOutcomeUnknownError('Event bulk results were not aligned');
      }
      aligned.push(result);
    }
    return aligned;
  }

  let response;
  try {
    response = await eventClient.bulkCreate(
      pendingWrites.map(({ document }) => document),
      // `wait_for` lets the immediate triage `_count` see the newly written event version.
      { throwOnFail: false, refresh: 'wait_for' }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Elasticsearch transport error';
    throw createBulkWriteOutcomeUnknownError(`Event bulk write outcome is unknown: ${message}`);
  }

  const createResults = extractCreateResults(response, pendingWrites.length, 'Event');

  pendingWrites.forEach(({ item, status }, responseIndex) => {
    const detail = createResults[responseIndex];
    results[item.index] = detail.error
      ? {
          index: item.index,
          event_id: item.eventId,
          status,
          written: false,
          reason: 'bulk_error',
          error: toCompactBulkError(detail),
        }
      : {
          index: item.index,
          event_uuid: item.eventUuid,
          event_id: item.eventId,
          status,
          written: true,
        };
  });

  const aligned: EventsWriteBulkResult[] = [];
  for (const result of results) {
    if (result === undefined) {
      throw createBulkWriteOutcomeUnknownError(
        'Event bulk results were not aligned with every input'
      );
    }
    aligned.push(result);
  }
  return aligned;
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
      // Treat a skip as success for single-item callers — return a synthetic result.
      throw createBulkWriteOutcomeUnknownError(
        `Event write skipped (duplicate within window): existing event_id=${result.existing_event_id}`
      );
    }
    throw createBulkWriteItemError(result.error);
  }
  return result;
}
