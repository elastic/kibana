/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type BlastRadiusEntry,
  type CausalFeature,
  type SignificantEvent,
  type SignalEntry,
  MAX_SIGNAL_DESCRIPTION_LENGTH,
} from '@kbn/significant-events-schema';

type EpisodeContextSource = Pick<SignificantEvent, '@timestamp'> &
  Partial<Pick<SignificantEvent, 'stream_names' | 'causal_features' | 'blast_radius'>>;

export const extractRuleUuids = (signals: SignalEntry[] | undefined): string[] => {
  const uuids = (signals ?? [])
    .filter((signal): signal is Extract<SignalEntry, { type: 'detection' }> =>
      Boolean(signal.type === 'detection' && signal.metadata.rule_uuid)
    )
    .map((signal) => signal.metadata.rule_uuid as string);
  return [...new Set(uuids)];
};

export const extractRuleUuidsFromEvents = (
  events: Array<Pick<SignificantEvent, 'signals'> | undefined>
): Set<string> => new Set(events.flatMap((event) => extractRuleUuids(event?.signals)));

/** True when any submitted detection UUID is absent from the known episode set. */
export const addsNewDetectionRules = (
  submittedRuleUuids: string[],
  knownRuleUuids: Iterable<string>
): boolean => {
  const known = knownRuleUuids instanceof Set ? knownRuleUuids : new Set(knownRuleUuids);
  return submittedRuleUuids.some((uuid) => !known.has(uuid));
};

/**
 * Collision-safe (for current stream name and UUID formats) length-prefixed stream-and-rules identity used for duplicate detection.
 * Uses exact-set matching: `['A']` produces a distinct key from `['A', 'B']`.
 * Length prefixes ensure `['a|b']` and `['a', 'b']` cannot collide.
 */
export const makeIdentity = ({
  streamNames,
  ruleUuids,
}: {
  streamNames: string[];
  ruleUuids: string[];
}): string =>
  [streamNames.length, ...[...streamNames].sort(), ruleUuids.length, ...[...ruleUuids].sort()].join(
    '|'
  );

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
  ).map((signal) =>
    signal.description.length <= MAX_SIGNAL_DESCRIPTION_LENGTH
      ? signal
      : { ...signal, description: signal.description.slice(0, MAX_SIGNAL_DESCRIPTION_LENGTH) }
  );

/** Unions stream names and topology across prior episode documents and the submitted payload. */
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

/**
 * When a continuation introduces no new rule UUIDs beyond those any stored version already
 * carries, freezes the event's stored `title` and `symptom_hypothesis` to prevent identity hijack
 * — the scenario where an unrelated condition's narrative replaces the original event
 * title/hypothesis while the old rules are still listed in `signals`.
 *
 * `knownRuleUuids` must be the union of detection UUIDs across prior docs (including latest), the
 * same set `shouldSkipAsNoOp` uses, so a historically known rule missing from the latest snapshot
 * is not treated as new.
 *
 * Returns frozen values plus `narrativePreserved: true` when the guard fires, or `undefined` when
 * the caller may use the submitted narrative unchanged.
 *
 * `summary` and `assessment_note` are intentionally NOT frozen: those fields carry per-cycle
 * observations and must remain caller-controlled. Only the event identity fields are protected.
 */
export const preserveStableNarrative = (
  submittedRuleUuids: string[],
  latestEvent: SignificantEvent | undefined,
  knownRuleUuids: Iterable<string>
):
  | (Pick<SignificantEvent, 'title'> &
      Partial<Pick<SignificantEvent, 'symptom_hypothesis'>> & { narrativePreserved: true })
  | undefined => {
  if (latestEvent === undefined) return undefined;
  if (addsNewDetectionRules(submittedRuleUuids, knownRuleUuids)) return undefined;

  return {
    title: latestEvent.title,
    ...(latestEvent.symptom_hypothesis !== undefined
      ? { symptom_hypothesis: latestEvent.symptom_hypothesis }
      : {}),
    narrativePreserved: true,
  };
};
