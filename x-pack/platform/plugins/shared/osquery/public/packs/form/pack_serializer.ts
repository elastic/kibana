/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { RRuleScheduleConfig, ScheduleType } from '../../../common/schedule';

/**
 * Default query interval (seconds) applied when a pack query carries no parsable
 * interval. Mirrors the osquery scheduling default of one hour.
 */
export const DEFAULT_PACK_QUERY_INTERVAL_SECONDS = 3600;

/**
 * AUTHORITATIVE NOTE ON QUERY SHAPES.
 *
 * A pack's `queries` arrive in one of two shapes, and BOTH are live:
 *  - the public-API ARRAY form (the `find` route) where the query name lives in
 *    `id` and `ecs_mapping` is an ARRAY of `{ key, value }`; and
 *  - the name-keyed RECORD form (the saved-object `read` route / internal API)
 *    where the key is the query name and `ecs_mapping` is the osquery object.
 *
 * Neither branch is dead code. The serializer detects the shape at runtime and
 * narrows defensively — the static `PackSavedObject` type does not match the
 * runtime array shape, so `ApiPackQuery` fields are kept optional/loose.
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
}

/**
 * The exporter reads a pack's `name`, `description`, and `queries`. `queries` is
 * typed as either shape (see the authoritative note above) so callers can pass
 * their real `PackSavedObject` / `PackItem` — `Array.isArray` narrows the union
 * at runtime instead of relying on a blind cast.
 */
interface ExportablePack {
  name: string;
  description?: string;
  queries: ApiPackQuery[] | Record<string, ApiPackQuery>;
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
 * A pack exported as portable Kibana-pack JSON. Round-trips the portable fields
 * (name / description / queries / schedule); cluster-specific state and
 * enablement are reassigned on import. The export is intentionally lossy: it
 * omits `enabled` (the importer force-sets imported packs to disabled),
 * `policy_ids`, `shards`, and all internal IDs, and narrows a query's `version`
 * array to its first element.
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
    interval: Number.isFinite(parsedInterval)
      ? parsedInterval
      : DEFAULT_PACK_QUERY_INTERVAL_SECONDS,
  };

  if (typeof source.timeout === 'number') {
    query.timeout = source.timeout;
  }

  if (source.platform) {
    query.platform = Array.isArray(source.platform) ? source.platform.join(',') : source.platform;
  }

  if (source.version) {
    // By design we export a single osquery version (version is conventionally a
    // scalar minimum), so an array source is narrowed to its first element.
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
 * NAME. Reads whichever query shape the pack carries (see the authoritative
 * note at the top of this file), converts `ecs_mapping` to the osquery object
 * form and `interval` to a number, and drops all cluster-internal /
 * saved-object fields (and `enabled`) by construction: we only ever copy the
 * portable fields onto the output.
 */
export const serializePack = (pack: ExportablePack): ExportedPack => {
  const entries = Array.isArray(pack.queries)
    ? // Public-API array form: the query name lives in `id`.
      pack.queries.map((q, index) => serializeQuery(q.id ?? `${index}`, q))
    : // Name-keyed object form (saved object / internal API).
      Object.entries(pack.queries ?? {}).map(([name, q]) => serializeQuery(name, q));

  const exported: ExportedPack = {
    name: pack.name,
    queries: Object.fromEntries(entries),
  };

  if (pack.description) {
    exported.description = pack.description;
  }

  // Pack-level schedule — carry the portable schedule fields through when
  // present. It only appears on the source pack when `rruleScheduling` is
  // enabled, so this is dormant until that feature ships.
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

// Windows-reserved chars, path separators, and any whitespace. Control chars
// (C0/C1, NUL, DEL) are handled separately in `stripIllegalChars` to keep this
// regex free of control-char literals.
const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\s]/g;

// Windows-reserved device names (case-insensitive), which cannot be used as a
// bare basename even with an extension.
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

// Cap the base so the final filename stays well under the 255-byte limit
// common to most filesystems, leaving room for the `.json` extension.
const MAX_FILENAME_BASE_LENGTH = 200;

const trimSeparators = (value: string): string => value.replace(/^[._]+|[._]+$/g, '');

/**
 * Replace illegal filename characters with `_`: the Windows-reserved chars,
 * path separators, and whitespace via `ILLEGAL_FILENAME_CHARS`, plus C0/C1
 * control chars (0x00–0x1F, 0x7F–0x9F) matched by code point so no control-char
 * literal appears in a regex.
 */
const stripIllegalChars = (value: string): string =>
  value
    .replace(ILLEGAL_FILENAME_CHARS, '_')
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);

      return code <= 0x1f || (code >= 0x7f && code <= 0x9f) ? '_' : char;
    })
    .join('');

/**
 * Derive a safe, cross-platform `.json` filename from a pack name. Illegal
 * filesystem characters, control chars, and whitespace are replaced with `_`;
 * surrounding dots and underscores are trimmed; the base is length-capped;
 * Windows-reserved device names (CON, PRN, …) are prefixed so they are no
 * longer reserved; and an empty result falls back to a stable default so the
 * download is never empty or misleading.
 */
export const packExportFilename = (name: string): string => {
  let base = trimSeparators(stripIllegalChars(name ?? ''));

  if (base.length > MAX_FILENAME_BASE_LENGTH) {
    base = trimSeparators(base.slice(0, MAX_FILENAME_BASE_LENGTH));
  }

  if (WINDOWS_RESERVED_NAMES.test(base)) {
    base = `_${base}`;
  }

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
