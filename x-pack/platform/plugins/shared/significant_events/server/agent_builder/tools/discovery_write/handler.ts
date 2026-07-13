/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Discovery } from '@kbn/significant-events-schema';
import type { DiscoveryClient } from '../../../lib/significant_events/discoveries';

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
 * Input for writing a discovery document. Derived from the canonical Discovery schema.
 * `discovery_slug` is optional — omit for new episodes and the handler generates one
 * from stream/rule names + a UUID8 suffix. Pass verbatim for continuation writes.
 * `discovery_id` and `dedup_window` are write-side controls not persisted to the stream.
 */
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
  /** Auto-generated when omitted. Required for `kind: 'handled'` to reference the target. */
  discovery_id?: Discovery['discovery_id'];
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
 * Parses simple ES date math expressions like "now-1h", "now-30m", "now-7d"
 * into milliseconds offset. Only supports now-N{h|m|d|s} patterns.
 * Returns `undefined` for unrecognised expressions — callers should skip
 * dedup rather than silently falling back to a wrong window.
 */
export const parseDateMathToMs = (expr: string): number | undefined => {
  const match = expr.match(/^now-(\d+)([smhd])$/);
  if (!match) return undefined;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 60 * 60 * 1000);
};

export async function discoveryWriteHandler({
  discoveryClient,
  input,
}: {
  discoveryClient: DiscoveryClient;
  input: DiscoveryWriteInput;
}): Promise<DiscoveryWriteResult> {
  const { dedup_window: dedupWindow, discovery_slug, ...rest } = input;

  const resolvedSlug = discovery_slug || generateDiscoverySlug(rest.stream_names, rest.rule_names);

  const discoveryInput = { ...rest, discovery_slug: resolvedSlug };

  // Dedup only new episodes (auto-generated slugs). Explicit slugs are continuation/clearance and
  // always append. Unrecognised dedup_window → undefined → skip rather than guess a window.
  const windowMs = dedupWindow != null ? parseDateMathToMs(dedupWindow) : undefined;
  const isExplicitSlug = discovery_slug != null;
  if (
    !isExplicitSlug &&
    discoveryInput.kind !== 'handled' &&
    discoveryInput.kind !== 'clearance' &&
    windowMs != null
  ) {
    const cutoffIso = new Date(Date.now() - windowMs).toISOString();
    const fingerprint = incidentFingerprint(
      discoveryInput.kind,
      rest.stream_names,
      rest.rule_names
    );
    const { hits } = await discoveryClient.findLatest({ from: cutoffIso });
    const recent = hits.find(
      (d) => incidentFingerprint(d.kind, d.stream_names ?? [], d.rule_names ?? []) === fingerprint
    );
    if (recent) {
      return {
        discovery_id: recent.discovery_id,
        discovery_slug: recent.discovery_slug ?? resolvedSlug,
        kind: discoveryInput.kind,
        written: false,
        skipped: true,
        reason: 'duplicate_within_window',
        existing_discovery_id: recent.discovery_id,
      };
    }
  }

  const now = new Date().toISOString();
  const discoveryId = discoveryInput.discovery_id || uuidv4();

  await discoveryClient.bulkCreate(
    [
      {
        '@timestamp': now,
        discovered_at: discoveryInput.kind === 'discovery' ? now : undefined,
        ...discoveryInput,
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
