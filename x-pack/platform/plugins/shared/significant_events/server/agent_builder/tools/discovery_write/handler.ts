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
  type Discovery,
  type SignalEntry,
} from '@kbn/significant-events-schema';
import type { DiscoveryClient } from '../../../lib/significant_events/discoveries';
import {
  assertUniqueBulkWriteKeys,
  assertValidBulkWriteSize,
  createBulkWriteOutcomeUnknownError,
  extractCreateResults,
  type CompactBulkError,
  toCompactBulkError,
} from '../bulk_write';

export type DiscoveryWriteInput = Pick<
  Discovery,
  | 'kind'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'severity'
  | 'stream_names'
  | 'confidence'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'previous_discovery_id'
  | 'workflow_execution_id'
  | 'conversation_id'
> & {
  /**
   * Omit for new events — auto-generated from the stream, rule UUIDs, and a random suffix.
   * Deduplication uses `makeFingerprint`, not this ID. Pass verbatim for a continuation.
   */
  event_id?: Discovery['event_id'];
  /** Deduplication window (ES date math, e.g. `"now-24h"`). Not stored in the document. */
  dedup_window?: string;
};

export interface DiscoveryWriteSuccessResult {
  index: number;
  discovery_id: string;
  event_id: string;
  kind: Discovery['kind'];
  written: true;
}

export interface DiscoveryWriteDuplicateResult {
  index: number;
  discovery_id: string;
  event_id: string;
  kind: Discovery['kind'];
  written: false;
  skipped: true;
  reason: 'duplicate_within_window';
  existing_discovery_id: string;
}

export interface DiscoveryWriteFailureResult {
  index: number;
  discovery_id: string;
  event_id: string;
  kind: Discovery['kind'];
  written: false;
  reason: 'bulk_error';
  error: CompactBulkError;
}

export type DiscoveryWriteResult = DiscoveryWriteSuccessResult | DiscoveryWriteDuplicateResult;
export type DiscoveryWriteBulkResult = DiscoveryWriteResult | DiscoveryWriteFailureResult;

/**
 * `rule_uuid` from every `type: 'detection'` signal, deduplicated. Detection signals are the only
 * signal type with a `rule_uuid`; other signal types carry no rule identity to extract.
 */
const extractRuleUuids = (signals: SignalEntry[] | undefined): string[] => {
  const uuids = (signals ?? [])
    .filter((signal): signal is Extract<SignalEntry, { type: 'detection' }> =>
      Boolean(signal.type === 'detection' && signal.metadata.rule_uuid)
    )
    .map((signal) => signal.metadata.rule_uuid as string);
  return [...new Set(uuids)];
};

/**
 * Returns true when any submitted detection signal has a different `change_point_type` than
 * the candidate discovery's signal for the same rule UUID. A changed change-point type means
 * the alerting engine observed a new pattern (e.g. spike → dip) and the write represents a
 * different operational state — it must not be suppressed as a duplicate.
 */
const hasChangedChangePointType = (
  submitted: SignalEntry[] | undefined,
  candidate: Discovery
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
    return s.metadata.change_point_type !== existing.metadata.change_point_type;
  });
};

/**
 * Per-incident event ID: a hash of the primary stream name, every detection rule UUID, and a
 * random UUID8 suffix. The suffix keeps distinct incidents for the same rules separate in the UI.
 * Deduplication uses `makeFingerprint` (stream and rules only) instead of this ID.
 */
export const generateEventId = (streamNames: string[], ruleUuids: string[]): string => {
  const suffix = uuidv4().replace(/-/g, '').slice(0, 8);
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  const basis = [primaryStream, ...[...ruleUuids].sort(), suffix].join('|');
  return createHash('sha256').update(basis).digest('hex').slice(0, 16);
};

/** Stable stream-and-rules identity used only for duplicate detection within the configured window. */
export const makeFingerprint = (streamNames: string[], ruleUuids: string[]): string => {
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  return [primaryStream, ...[...ruleUuids].sort()].join('|');
};

const isDateMathExpression = (value: string): boolean =>
  value.startsWith('now') || value.includes('||');

/**
 * Parses a past-relative ES date math expression into a millisecond offset from `now`.
 * Returns `undefined` for unrecognised expressions so callers skip deduplication instead of
 * silently applying the wrong window.
 */
const parseDateMathToMs = (expr: string, now: Date): number | undefined => {
  if (!isDateMathExpression(expr)) {
    return undefined;
  }
  const parsed = dateMath.parse(expr, { forceNow: now });
  return parsed?.isValid() ? now.getTime() - parsed.valueOf() : undefined;
};

/**
 * Merges prior discovery signals with the submitted signals, keeping the latest detection signal
 * per `metadata.rule_uuid`. Prior-only rules are carried forward; submitted rules win ties.
 */
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
  priorDocs: Array<Pick<Discovery, '@timestamp' | 'signals'>>,
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

type EpisodeContextSource = Pick<Discovery, '@timestamp'> &
  Partial<Pick<Discovery, 'stream_names' | 'causal_features' | 'blast_radius'>>;

/**
 * Accumulates topology observed during an episode. The latest entry for a feature wins.
 * When the same feature_id appears in both arrays in any document, causal wins.
 */
export const mergeEpisodeContext = (
  priorDocs: EpisodeContextSource[],
  submitted: Omit<EpisodeContextSource, '@timestamp'> & {
    stream_names: Discovery['stream_names'];
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

interface PreparedInput {
  index: number;
  input: DiscoveryWriteInput;
  cutoffMs?: number;
  fingerprint?: string;
}

/**
 * Validates constraints that must fail before any reads or writes, then precomputes deduplication
 * data for eligible new discoveries. Continuations, handled markers, clearances, and invalid
 * windows intentionally have no fingerprint or cutoff.
 */
const prepareInputs = (inputs: DiscoveryWriteInput[], now: Date): PreparedInput[] => {
  assertValidBulkWriteSize(inputs);
  assertUniqueBulkWriteKeys(
    inputs.flatMap((input, index) =>
      input.event_id === undefined ? [] : [{ index, key: input.event_id }]
    ),
    'event_id'
  );

  const prepared = inputs.map((input, index) => {
    const windowMs = input.dedup_window ? parseDateMathToMs(input.dedup_window, now) : undefined;
    const isDedupEligible =
      input.event_id === undefined && input.kind === 'discovery' && windowMs !== undefined;
    return {
      index,
      input,
      cutoffMs: isDedupEligible ? now.getTime() - windowMs : undefined,
      fingerprint: isDedupEligible
        ? makeFingerprint(input.stream_names, extractRuleUuids(input.signals))
        : undefined,
    };
  });

  assertUniqueBulkWriteKeys(
    prepared.flatMap(({ index, fingerprint }) =>
      fingerprint === undefined ? [] : [{ index, key: fingerprint }]
    ),
    'discovery fingerprint'
  );
  return prepared;
};

const findExistingDuplicate = (
  prepared: PreparedInput,
  recentDiscoveries: Discovery[]
): Discovery | undefined => {
  if (prepared.fingerprint === undefined || prepared.cutoffMs === undefined) {
    return undefined;
  }
  const { cutoffMs, fingerprint } = prepared;
  // Match each item against its own cutoff. The candidates come from findLatest, which excludes
  // handled markers and returns only the latest document per event, so an old resolved version
  // cannot block a new incident.
  const candidate = recentDiscoveries.find(
    (discovery) =>
      discovery.kind === 'discovery' &&
      Date.parse(discovery['@timestamp']) >= cutoffMs &&
      makeFingerprint(discovery.stream_names ?? [], extractRuleUuids(discovery.signals)) ===
        fingerprint
  );

  if (!candidate) return undefined;
  // A changed change_point_type (e.g. spike → dip) for the same rule represents a different
  // operational state and must not be suppressed as a duplicate of the prior write.
  if (hasChangedChangePointType(prepared.input.signals, candidate)) return undefined;
  return candidate;
};

/**
 * Writes a batch while preserving input order in the returned results. Duplicate discoveries are
 * resolved without writing; all remaining documents share one bulk request and expose item-level
 * failures without obscuring successful or skipped siblings.
 */
export async function discoveryWriteBulkHandler({
  discoveryClient,
  inputs,
}: {
  discoveryClient: DiscoveryClient;
  inputs: DiscoveryWriteInput[];
}): Promise<DiscoveryWriteBulkResult[]> {
  const now = new Date();
  const preparedInputs = prepareInputs(inputs, now);
  const cutoffs = preparedInputs.flatMap(({ cutoffMs }) =>
    cutoffMs === undefined ? [] : [cutoffMs]
  );
  // Scan once from the earliest eligible cutoff and apply each item's narrower window in memory.
  // ES|QL `IN` does not perform membership checks on multivalued keyword fields such as
  // `stream_names`, so the stream-and-rules fingerprint is also matched in memory.
  const recentDiscoveries =
    cutoffs.length === 0
      ? []
      : (
          await discoveryClient.findLatest({
            from: new Date(Math.min(...cutoffs)).toISOString(),
          })
        ).hits;

  const results: Array<DiscoveryWriteBulkResult | undefined> = new Array(inputs.length);
  const inputsToCreate: Array<PreparedInput & { eventId: string; discoveryId: string }> = [];

  for (const prepared of preparedInputs) {
    const duplicate = findExistingDuplicate(prepared, recentDiscoveries);
    if (duplicate) {
      const eventId =
        duplicate.event_id ??
        generateEventId(prepared.input.stream_names, extractRuleUuids(prepared.input.signals));
      results[prepared.index] = {
        index: prepared.index,
        discovery_id: duplicate.discovery_id,
        event_id: eventId,
        kind: prepared.input.kind,
        written: false,
        skipped: true,
        reason: 'duplicate_within_window',
        existing_discovery_id: duplicate.discovery_id,
      };
      continue;
    }

    inputsToCreate.push({
      ...prepared,
      eventId:
        prepared.input.event_id ??
        generateEventId(prepared.input.stream_names, extractRuleUuids(prepared.input.signals)),
      discoveryId: uuidv4(),
    });
  }

  const priorDocsByEventId = new Map<string, Discovery[]>();
  // Continuation writes are full snapshots. Fetch their histories in parallel and exclude handled
  // markers so processed cycles do not carry marker signals into the next discovery version.
  await Promise.all(
    inputsToCreate
      .filter(({ input }) => input.event_id !== undefined && input.kind !== 'handled')
      .map(async ({ eventId }) => {
        const { hits } = await discoveryClient.findByEventId(eventId);
        priorDocsByEventId.set(
          eventId,
          hits.filter((doc) => doc.kind !== 'handled')
        );
      })
  );

  const timestamp = now.toISOString();
  const pendingWrites = inputsToCreate.map((prepared) => {
    const { dedup_window: _dedupWindow, event_id: _eventId, ...rest } = prepared.input;
    const isContinuation =
      prepared.input.event_id !== undefined && prepared.input.kind !== 'handled';
    const priorDocs = priorDocsByEventId.get(prepared.eventId) ?? [];
    const signals = isContinuation
      ? mergeSignalsLatestPerRule(priorDocs, prepared.input.signals ?? [], timestamp)
      : prepared.input.signals ?? [];
    // A continuation carries prior topology (causal_features, blast_radius) and stream_names
    // forward, accumulating the full episode rather than replacing it with only the latest write.
    const episodeContext = isContinuation
      ? mergeEpisodeContext(priorDocs, rest, timestamp)
      : {
          streamNames: rest.stream_names,
          causalFeatures: rest.causal_features ?? [],
          blastRadius: rest.blast_radius ?? [],
        };
    return {
      ...prepared,
      document: {
        ...rest,
        '@timestamp': timestamp,
        discovered_at: prepared.input.kind === 'discovery' ? timestamp : undefined,
        event_id: prepared.eventId,
        discovery_id: prepared.discoveryId,
        signals,
        stream_names: episodeContext.streamNames,
        causal_features: episodeContext.causalFeatures,
        blast_radius: episodeContext.blastRadius,
        severity: prepared.input.severity,
      },
    };
  });

  if (pendingWrites.length > 0) {
    let response;
    try {
      response = await discoveryClient.bulkCreate(
        pendingWrites.map(({ document }) => document),
        { throwOnFail: false }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Elasticsearch transport error';
      throw createBulkWriteOutcomeUnknownError(
        `Discovery bulk write outcome is unknown: ${message}`
      );
    }

    const createResults = extractCreateResults(response, pendingWrites.length, 'Discovery');

    pendingWrites.forEach(({ index, discoveryId, eventId, input }, responseIndex) => {
      const detail = createResults[responseIndex];
      results[index] = detail.error
        ? {
            index,
            discovery_id: discoveryId,
            event_id: eventId,
            kind: input.kind,
            written: false,
            reason: 'bulk_error',
            error: toCompactBulkError(detail),
          }
        : {
            index,
            discovery_id: discoveryId,
            event_id: eventId,
            kind: input.kind,
            written: true,
          };
    });
  }

  const alignedResults: DiscoveryWriteBulkResult[] = [];
  for (const result of results) {
    if (result === undefined) {
      throw createBulkWriteOutcomeUnknownError(
        'Discovery bulk results were not aligned with every input'
      );
    }
    alignedResults.push(result);
  }
  return alignedResults;
}
