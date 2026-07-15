/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import dateMath from '@kbn/datemath';
import type { Discovery } from '@kbn/significant-events-schema';
import type { DiscoveryClient } from '../../../lib/significant_events/discoveries';

export type DiscoveryWriteInput = Pick<
  Discovery,
  | 'kind'
  | 'title'
  | 'summary'
  | 'root_cause'
  | 'impact'
  | 'rule_names'
  | 'stream_names'
  | 'criticality'
  | 'confidence'
  | 'detections'
  | 'dependency_edges'
  | 'infra_components'
  | 'cause_kis'
  | 'evidences'
  | 'parent_discovery_id'
  | 'grouped_discovery_ids'
  | 'grouping_rationale'
  | 'previous_discovery_id'
  | 'workflow_execution_id'
  | 'conversation_id'
> & {
  /** Omit for new episodes — auto-generated from stream/rule names + UUID8. Pass verbatim for continuation. */
  discovery_slug?: Discovery['discovery_slug'];
  /** Deduplication window (ES date math, e.g. `"now-1h"`). Not stored in the document. */
  dedup_window?: string;
};

export interface DiscoveryWriteResult {
  discovery_id: string;
  discovery_slug: string;
  kind: Discovery['kind'];
  written: boolean;
  skipped?: boolean;
  reason?: string;
  existing_discovery_id?: string;
}

/**
 * Normalises a free-text string into a slug fragment:
 * lowercase, runs of non-alphanumeric chars → single hyphen, leading/trailing
 * hyphens stripped, truncated to 40 characters.
 */
const slugify = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

/**
 * Display-only slug prefix `<stream>__<rule>` from the smallest stream's last segment and the
 * smallest rule name (sorted for determinism). Dedup keys off {@link incidentFingerprint}.
 */
export const discoveryStem = (streamNames: string[], ruleNames: string[]): string => {
  const rawStream = [...streamNames].sort()[0] ?? 'unknown';
  const streamPart = slugify(rawStream.split('.').pop() ?? rawStream);
  const rulePart = slugify([...ruleNames].sort()[0] ?? 'unknown');
  return `${streamPart}__${rulePart}`;
};

/**
 * Order-independent identity of an incident from the full stream/rule sets + kind. Dedup matches
 * on this so a re-ordered but otherwise identical write is caught. Rule-set drift is intentionally
 * excluded — genuine continuation reuses an explicit slug, which skips dedup.
 */
export const incidentFingerprint = (
  kind: Discovery['kind'],
  streamNames: string[],
  ruleNames: string[]
): string => [kind, [...streamNames].sort().join(','), [...ruleNames].sort().join(',')].join('|');

/**
 * Generates a new episode slug: the stable stem plus a random UUID8 suffix.
 * Format: `<stem>-<uuid8>`.
 */
export const generateDiscoverySlug = (streamNames: string[], ruleNames: string[]): string => {
  const suffix = uuidv4().replace(/-/g, '').slice(0, 8);
  return `${discoveryStem(streamNames, ruleNames)}-${suffix}`;
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

export type DiscoveryDetection = Discovery['detections'][number];

export const mergeDetectionsLatestPerRule = (
  priorDocs: Array<Pick<Discovery, '@timestamp' | 'detections'>>,
  submitted: DiscoveryDetection[],
  submittedTimestamp: string
): DiscoveryDetection[] => {
  const latest = new Map<string, { timestamp: string; detection: DiscoveryDetection }>();

  // submitted considered last, so it wins equal-timestamp ties.
  const consider = (timestamp: string, detections: DiscoveryDetection[] = []) => {
    for (const detection of detections) {
      const existing = latest.get(detection.rule_uuid);
      if (existing === undefined || timestamp >= existing.timestamp) {
        latest.set(detection.rule_uuid, { timestamp, detection });
      }
    }
  };

  priorDocs.forEach((doc) => consider(doc['@timestamp'], doc.detections ?? []));
  consider(submittedTimestamp, submitted);

  return [...latest.values()].map((entry) => entry.detection);
};

export type DiscoveryEvidence = NonNullable<Discovery['evidences']>[number];

export const mergeEvidencesForCarriedRules = (
  priorDocs: Array<Pick<Discovery, '@timestamp' | 'evidences'>>,
  submitted: DiscoveryEvidence[]
): DiscoveryEvidence[] => {
  const merged: DiscoveryEvidence[] = [...submitted];
  const coveredRules = new Set(
    submitted.map((e) => e.rule_uuid).filter((id): id is string => Boolean(id))
  );

  const latestPerCarriedRule = new Map<
    string,
    { timestamp: string; evidence: DiscoveryEvidence }
  >();
  for (const doc of priorDocs) {
    for (const evidence of doc.evidences ?? []) {
      const ruleId = evidence.rule_uuid;
      if (!ruleId || coveredRules.has(ruleId)) continue; // keyless dropped; submitted wins
      const existing = latestPerCarriedRule.get(ruleId);
      if (existing === undefined || doc['@timestamp'] >= existing.timestamp) {
        latestPerCarriedRule.set(ruleId, { timestamp: doc['@timestamp'], evidence });
      }
    }
  }
  latestPerCarriedRule.forEach(({ evidence }) => merged.push(evidence));

  return merged;
};

const findDuplicateDiscovery = async ({
  discoveryClient,
  input,
  dedupWindow,
  isExplicitSlug,
}: {
  discoveryClient: DiscoveryClient;
  input: Pick<DiscoveryWriteInput, 'kind' | 'stream_names' | 'rule_names'>;
  dedupWindow: string | undefined;
  isExplicitSlug: boolean;
}): Promise<Discovery | undefined> => {
  const windowMs = dedupWindow ? parseDateMathToMs(dedupWindow) : undefined;
  if (
    isExplicitSlug ||
    input.kind === 'handled' ||
    input.kind === 'clearance' ||
    windowMs === undefined
  ) {
    return undefined;
  }

  const cutoffIso = new Date(Date.now() - windowMs).toISOString();
  const fingerprint = incidentFingerprint(input.kind, input.stream_names, input.rule_names);
  const { hits } = await discoveryClient.findLatest({ from: cutoffIso });

  return hits.find(
    (discovery) =>
      incidentFingerprint(
        discovery.kind,
        discovery.stream_names ?? [],
        discovery.rule_names ?? []
      ) === fingerprint
  );
};

const prepareSnapshotFields = async ({
  discoveryClient,
  input,
  isExplicitSlug,
  timestamp,
}: {
  discoveryClient: DiscoveryClient;
  input: DiscoveryWriteInput & { discovery_slug: string };
  isExplicitSlug: boolean;
  timestamp: string;
}): Promise<Pick<DiscoveryWriteInput, 'detections' | 'evidences'>> => {
  if (!isExplicitSlug || input.kind === 'handled') {
    return {
      detections: input.detections,
      evidences: input.evidences,
    };
  }

  const { hits: priorDocs } = await discoveryClient.findStateBySlug(input.discovery_slug);
  return {
    detections: mergeDetectionsLatestPerRule(priorDocs, input.detections ?? [], timestamp),
    evidences: mergeEvidencesForCarriedRules(priorDocs, input.evidences ?? []),
  };
};

export async function discoveryWriteHandler({
  discoveryClient,
  input,
}: {
  discoveryClient: DiscoveryClient;
  input: DiscoveryWriteInput;
}): Promise<DiscoveryWriteResult> {
  const { dedup_window: dedupWindow, discovery_slug: discoverySlug, ...rest } = input;
  const resolvedSlug = discoverySlug || generateDiscoverySlug(rest.stream_names, rest.rule_names);
  const discoveryInput = { ...rest, discovery_slug: resolvedSlug };
  const isExplicitSlug = Boolean(discoverySlug);

  const duplicate = await findDuplicateDiscovery({
    discoveryClient,
    input: rest,
    dedupWindow,
    isExplicitSlug,
  });
  if (duplicate) {
    return {
      discovery_id: duplicate.discovery_id,
      discovery_slug: duplicate.discovery_slug ?? resolvedSlug,
      kind: discoveryInput.kind,
      written: false,
      skipped: true,
      reason: 'duplicate_within_window',
      existing_discovery_id: duplicate.discovery_id,
    };
  }

  const discoveryId = uuidv4();

  const timestamp = new Date().toISOString();
  const { detections, evidences } = await prepareSnapshotFields({
    discoveryClient,
    input: discoveryInput,
    isExplicitSlug,
    timestamp,
  });

  await discoveryClient.bulkCreate(
    [
      {
        '@timestamp': timestamp,
        discovered_at: discoveryInput.kind === 'discovery' ? timestamp : undefined,
        ...discoveryInput,
        detections,
        evidences,
        discovery_id: discoveryId,
        processed: discoveryInput.kind === 'handled',
      },
    ],
    { throwOnFail: true }
  );

  return {
    discovery_id: discoveryId,
    discovery_slug: resolvedSlug,
    kind: discoveryInput.kind,
    written: true,
  };
}
