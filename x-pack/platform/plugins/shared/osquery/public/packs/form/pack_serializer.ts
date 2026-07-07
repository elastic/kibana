/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { RRuleScheduleConfig, ScheduleType } from '../../../common/schedule';

/**
 * A single query as it appears on a pack fetched from the public packs API and
 * held by the Packs table. Note this is NOT the saved-object *type*: the public
 * API returns `queries` as an ARRAY where the query name lives in `id`, and
 * `ecs_mapping` as an ARRAY of `{ key, value }` (not the osquery object form).
 * This shape is the ground truth the exporter reads — verified at runtime. All
 * fields are optional/loose because the static `PackSavedObject` type does not
 * match this runtime shape; the serializer narrows defensively.
 */
interface ApiPackQuery {
  id?: string;
  query?: string;
  interval?: number | string;
  timeout?: number;
  platform?: string | string[];
  version?: string | string[];
  snapshot?: boolean;
  removed?: boolean;
  ecs_mapping?: ECSMapping | Array<{ key: string; value: ECSMapping[string] }>;
  [key: string]: unknown;
}

/**
 * The exporter reads a pack's `name`, `description`, and `queries`. `queries` is
 * typed loosely (array or record) so callers can pass their real
 * `PackSavedObject` / `PackItem` without a cast — the static SO type declares
 * `queries` as a name-keyed record, but at runtime the public API delivers an
 * array (name in `id`). Both are handled at runtime.
 */
interface ExportablePack {
  name: string;
  description?: string;
  queries: unknown;
  // Pack-level schedule. Only present when the `rruleScheduling` feature is on
  // (the read API strips it otherwise), so "export when present" is self-gating.
  schedule_type?: ScheduleType;
  interval?: number;
  rrule_schedule?: RRuleScheduleConfig;
}

/**
 * A single query in an exported pack. `interval` is emitted as a number and
 * `ecs_mapping` in the osquery object form. Cluster-internal / saved-object
 * fields (id, schedule_id, start_date, policy references, …) are never included.
 */
export interface ExportedPackQuery {
  query: string;
  interval: number;
  timeout?: number;
  platform?: string;
  version?: string;
  snapshot?: boolean;
  removed?: boolean;
  ecs_mapping?: ECSMapping;
}

/**
 * A pack exported as portable Kibana-pack JSON. Carries the pack `name` and
 * `description` so it can be reconstructed 1:1 on another cluster, plus the
 * queries keyed by name. Deliberately omits `enabled` (imported packs land
 * disabled) and all cluster-specific data (policy_ids, shards, internal IDs).
 */
export interface ExportedPack {
  name: string;
  description?: string;
  /**
   * Pack-level schedule, carried only when the source pack has one (i.e. the
   * `rruleScheduling` feature is enabled and a pack-level schedule is set).
   * `rrule` packs carry `rrule_schedule`; `interval` packs carry `interval`.
   */
  schedule_type?: ScheduleType;
  interval?: number;
  rrule_schedule?: RRuleScheduleConfig;
  queries: Record<string, ExportedPackQuery>;
}

/**
 * Normalize `ecs_mapping` to the osquery object form `{ <ecs-field>: { … } }`.
 * The public API returns it as an array of `{ key, value }`; the object form is
 * passed through unchanged. Returns undefined when empty so the field is omitted.
 */
const normalizeEcsMapping = (ecsMapping: ApiPackQuery['ecs_mapping']): ECSMapping | undefined => {
  if (!ecsMapping) {
    return undefined;
  }

  if (Array.isArray(ecsMapping)) {
    if (!ecsMapping.length) {
      return undefined;
    }

    return ecsMapping.reduce<ECSMapping>((acc, { key, value }) => {
      if (key) {
        acc[key] = value;
      }

      return acc;
    }, {});
  }

  return Object.keys(ecsMapping).length ? ecsMapping : undefined;
};

const serializeQuery = (name: string, source: ApiPackQuery): [string, ExportedPackQuery] => {
  // `interval` may be a number (public API) or a string (saved object); the
  // exported form uses a number.
  const parsedInterval =
    typeof source.interval === 'number' ? source.interval : parseInt(`${source.interval}`, 10);

  const query: ExportedPackQuery = {
    query: source.query ?? '',
    interval: Number.isFinite(parsedInterval) ? parsedInterval : 3600,
  };

  if (typeof source.timeout === 'number') {
    query.timeout = source.timeout;
  }

  if (source.platform) {
    query.platform = Array.isArray(source.platform) ? source.platform.join(',') : source.platform;
  }

  if (source.version) {
    query.version = Array.isArray(source.version) ? source.version[0] : source.version;
  }

  if (typeof source.snapshot === 'boolean') {
    query.snapshot = source.snapshot;
  }

  if (typeof source.removed === 'boolean') {
    query.removed = source.removed;
  }

  const ecsMapping = normalizeEcsMapping(source.ecs_mapping);
  if (ecsMapping) {
    query.ecs_mapping = ecsMapping;
  }

  return [name, query];
};

/**
 * Serialize a pack into portable Kibana-pack JSON.
 *
 * Emits `name`, `description` (when present), and `queries` keyed by the query
 * NAME. Reads whichever query shape the pack carries — the public-API array
 * (name in `id`) or the name-keyed object — converts `ecs_mapping` to the
 * osquery object form and `interval` to a number, and drops all
 * cluster-internal / saved-object fields (and `enabled`) by construction: we
 * only ever copy the portable fields onto the output.
 */
export const serializePack = (pack: ExportablePack): ExportedPack => {
  const entries = Array.isArray(pack.queries)
    ? // Public-API array form: the query name lives in `id`.
      (pack.queries as ApiPackQuery[]).map((q, index) => serializeQuery(q.id ?? `${index}`, q))
    : // Name-keyed object form (saved object / internal API).
      Object.entries((pack.queries ?? {}) as Record<string, ApiPackQuery>).map(([name, q]) =>
        serializeQuery(name, q)
      );

  const exported: ExportedPack = {
    name: pack.name,
    queries: Object.fromEntries(entries),
  };

  if (pack.description) {
    exported.description = pack.description;
  }

  // Pack-level schedule — carry it through 1:1 when present. It only appears on
  // the source pack when `rruleScheduling` is enabled, so this is dormant until
  // that feature ships.
  if (pack.schedule_type === 'rrule' && pack.rrule_schedule) {
    exported.schedule_type = 'rrule';
    exported.rrule_schedule = pack.rrule_schedule;
  } else if (pack.schedule_type === 'interval' && pack.interval != null) {
    exported.schedule_type = 'interval';
    exported.interval = pack.interval;
  }

  return exported;
};

const FILENAME_FALLBACK = 'pack';

// Windows-reserved chars, path separators, and any whitespace/control char.
const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\s]/g;

/**
 * Derive a safe, cross-platform `.json` filename from a pack name. Illegal
 * filesystem characters and whitespace are replaced with `_`; surrounding dots
 * and underscores are trimmed; an empty result falls back to a stable default
 * so the download is never empty or misleading.
 */
export const packExportFilename = (name: string): string => {
  const base = (name ?? '').replace(ILLEGAL_FILENAME_CHARS, '_').replace(/^[._]+|[._]+$/g, '');

  return `${base || FILENAME_FALLBACK}.json`;
};

/**
 * Serialize a pack and trigger a browser download of the `.json` file. Uses the
 * same anchor + `URL.createObjectURL` pattern (with deferred revocation) as
 * `results/use_export_results.ts` to avoid a race where the object URL is
 * revoked before the browser starts the download. Does not navigate away.
 */
export const downloadPackAsJson = (pack: ExportablePack): void => {
  const exported = serializePack(pack);
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = packExportFilename(pack.name);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Defer revocation so the browser can pick up the URL before we drop it
  // (Safari / older Chromium schedule the download asynchronously).
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
