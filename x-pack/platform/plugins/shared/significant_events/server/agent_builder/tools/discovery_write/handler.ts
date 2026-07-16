/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dateMath from '@kbn/datemath';
import { type Discovery, type SignalEntry } from '@kbn/significant-events-schema';
import type { DiscoveryClient } from '../../../lib/significant_events/discoveries';

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
  /** Omit for new events — auto-generated (stream + rule UUIDs + random suffix; dedup uses `makeFingerprint`, not this id). Pass verbatim for continuation. */
  event_id?: Discovery['event_id'];
  /** Deduplication window (ES date math, e.g. `"now-1h"`). Not stored in the document. */
  dedup_window?: string;
};

export interface DiscoveryWriteResult {
  discovery_id: string;
  event_id: string;
  kind: Discovery['kind'];
  written: boolean;
  skipped?: boolean;
  reason?: string;
  existing_discovery_id?: string;
}

/**
 * `rule_uuid` from every `type: 'detection'` signal, deduplicated. Detection signals are the only
 * signal type with a `rule_uuid`; other signal types (once added) carry no rule identity to extract.
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
 * Per-incident event id: a hash of the primary stream name plus every detection rule's
 * `rule_uuid` and a random UUID8 suffix. The suffix keeps each new incident instance unique so
 * resolved incidents and new ones for the same rules are treated as separate events in the UI.
 * Dedup uses `makeFingerprint` (stream + rules only, no suffix) rather than this id.
 */
export const generateEventId = (streamNames: string[], ruleUuids: string[]): string => {
  const suffix = uuidv4().replace(/-/g, '').slice(0, 8);
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  const basis = [primaryStream, ...[...ruleUuids].sort(), suffix].join('|');
  return createHash('sha256').update(basis).digest('hex').slice(0, 16);
};

export const makeFingerprint = (streamNames: string[], ruleUuids: string[]): string => {
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  return [primaryStream, ...[...ruleUuids].sort()].join('|');
};

/**
 * Parses past-relative ES date math expressions into a millisecond offset.
 * Returns `undefined` for unrecognised expressions — callers should skip
 * dedup rather than silently falling back to a wrong window.
 */
const isDateMathExpression = (value: string): boolean => {
  return value.startsWith('now') || value.includes('||');
};

const parseDateMathToMs = (expr: string): number | undefined => {
  if (!isDateMathExpression(expr)) {
    return undefined;
  }

  const now = new Date();
  const parsed = dateMath.parse(expr, { forceNow: now });
  return parsed?.isValid() ? now.getTime() - parsed.valueOf() : undefined;
};

/**
 * Merges signals from prior discovery documents with the submitted signals, keeping the
 * latest per `metadata.rule_uuid` for detection-type signals. Prior-only rules are carried
 * forward; submitted rules win on equal-timestamp ties.
 */
export const mergeSignalsLatestPerRule = (
  priorDocs: Array<Pick<Discovery, '@timestamp' | 'signals'>>,
  submitted: SignalEntry[],
  submittedTimestamp: string
): SignalEntry[] => {
  const latest = new Map<string, { timestamp: string; signal: SignalEntry }>();

  const consider = (timestamp: string, signals: SignalEntry[] = []) => {
    for (const signal of signals) {
      if (signal.type !== 'detection') continue;
      const ruleId = signal.metadata?.rule_uuid;
      if (!ruleId) continue;
      const existing = latest.get(ruleId);
      if (existing === undefined || timestamp >= existing.timestamp) {
        latest.set(ruleId, { timestamp, signal });
      }
    }
  };

  priorDocs.forEach((doc) => consider(doc['@timestamp'], doc.signals ?? []));
  consider(submittedTimestamp, submitted);

  return [...latest.values()].map((entry) => entry.signal);
};

const findDuplicateDiscovery = async ({
  discoveryClient,
  streamNames,
  signals,
  dedupWindow,
  kind,
  isExplicitEventId,
}: {
  discoveryClient: DiscoveryClient;
  streamNames: string[];
  signals: SignalEntry[] | undefined;
  dedupWindow: string | undefined;
  kind: Discovery['kind'];
  isExplicitEventId: boolean;
}): Promise<Discovery | undefined> => {
  const windowMs = dedupWindow ? parseDateMathToMs(dedupWindow) : undefined;
  // Skip dedup for continuations (explicit event_id), handled stamps, clearances, or unrecognised windows.
  if (isExplicitEventId || kind === 'handled' || kind === 'clearance' || windowMs === undefined) {
    return undefined;
  }

  const cutoffIso = new Date(Date.now() - windowMs).toISOString();
  const fingerprint = makeFingerprint(streamNames, extractRuleUuids(signals));
  // Scan recent active discoveries and match on stream+rules fingerprint in memory. ES|QL `IN`
  // does not perform membership checks on multivalued keyword fields such as `stream_names`.
  // Uses findLatest (grouped by event_id, excludes handled) so only the latest doc per incident
  // is considered — prevents stale resolved incidents from blocking new ones.
  const { hits } = await discoveryClient.findLatest({ from: cutoffIso });
  return hits.find(
    (h) =>
      h.kind === 'discovery' &&
      makeFingerprint(h.stream_names ?? [], extractRuleUuids(h.signals)) === fingerprint
  );
};

const prepareSnapshotSignals = async ({
  discoveryClient,
  input,
  isExplicitEventId,
  timestamp,
}: {
  discoveryClient: DiscoveryClient;
  input: DiscoveryWriteInput & { event_id: string };
  isExplicitEventId: boolean;
  timestamp: string;
}): Promise<SignalEntry[]> => {
  if (!isExplicitEventId || input.kind === 'handled') {
    return input.signals ?? [];
  }

  const { hits: priorDocs } = await discoveryClient.findByEventId(input.event_id);
  // Exclude handled stamps — the old findStateBySlug path filtered these out so processed
  // cycles do not carry their detection signals into a fresh continuation write.
  const stateDocs = priorDocs.filter((doc) => doc.kind !== 'handled');
  return mergeSignalsLatestPerRule(stateDocs, input.signals ?? [], timestamp);
};

export async function discoveryWriteHandler({
  discoveryClient,
  input,
}: {
  discoveryClient: DiscoveryClient;
  input: DiscoveryWriteInput;
}): Promise<DiscoveryWriteResult> {
  const { dedup_window: dedupWindow, event_id, ...rest } = input;

  const resolvedEventId =
    event_id || generateEventId(rest.stream_names, extractRuleUuids(rest.signals));

  const discoveryInput = {
    ...rest,
    event_id: resolvedEventId,
  };

  const isExplicitEventId = Boolean(event_id);

  const duplicate = await findDuplicateDiscovery({
    discoveryClient,
    streamNames: rest.stream_names,
    signals: rest.signals,
    dedupWindow,
    kind: rest.kind,
    isExplicitEventId,
  });
  if (duplicate) {
    return {
      discovery_id: duplicate.discovery_id,
      event_id: duplicate.event_id ?? resolvedEventId,
      kind: discoveryInput.kind,
      written: false,
      skipped: true,
      reason: 'duplicate_within_window',
      existing_discovery_id: duplicate.discovery_id,
    };
  }

  const discoveryId = uuidv4();

  const timestamp = new Date().toISOString();
  const signals = await prepareSnapshotSignals({
    discoveryClient,
    input: { ...discoveryInput, event_id: resolvedEventId },
    isExplicitEventId,
    timestamp,
  });

  await discoveryClient.bulkCreate(
    [
      {
        ...discoveryInput,
        '@timestamp': timestamp,
        discovered_at: discoveryInput.kind === 'discovery' ? timestamp : undefined,
        signals,
        discovery_id: discoveryId,
        severity: discoveryInput.severity,
      },
    ],
    { throwOnFail: true }
  );

  return {
    discovery_id: discoveryId,
    event_id: resolvedEventId,
    kind: discoveryInput.kind,
    written: true,
  };
}
