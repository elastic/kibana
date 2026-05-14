/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { RuntimeFieldSpec, RuntimeType } from '@kbn/data-views-plugin/common';

/**
 * Bumped whenever `SUFFIX_TO_RUNTIME_TYPE`, `NO_RUNTIME_FIELD_SUFFIXES`,
 * or `buildPainlessSource` changes shape. The build version is the prefix
 * on every fingerprint produced by `computeRuntimeFieldsFingerprint`, so
 * a bump invalidates every cached fingerprint and forces all spaces to
 * re-run the diff branch on their next ensure — which is the only way to
 * reliably propagate a transform-shape change.
 *
 * Tracker convention: increment by 1 whenever the resulting runtime field
 * spec for any input snake-key would differ from the previous build. Pure
 * comment / formatting changes don't require a bump.
 */
export const RUNTIME_FIELDS_BUILD_VERSION = 1;

/**
 * Maps the cases-template type suffixes (the second half of
 * `<name>_as_<type>` snake-keys) to Elasticsearch runtime field types.
 *
 * Source of truth: `common/types/domain/template/fields.ts` — the
 * `BaseFieldSchema.type` union across all field schemas. The runtime field
 * type set is smaller than the ES mapping type set, so we coerce all numeric
 * variants down to `long` or `double`.
 *
 * **Why `keyword` is in here too.** `cases.extended_fields` is mapped as
 * `flattened` (see `mappings/case.ts` for the field-limit rationale). Under
 * `flattened`, sub-keys are queryable in ES but **do not surface as
 * discoverable fields in Kibana data views** — only the parent
 * `cases.extended_fields` shows up in Discover / Lens / Stack Management.
 * To make per-field keyword values navigable in those UIs we publish a
 * keyword runtime field at `cases.<name>_as_keyword` that emits the value
 * from `doc['cases.extended_fields.<name>_as_keyword']`. Without this,
 * every `keyword`-typed template field would be invisible to the analytics
 * surface.
 *
 * `unsigned_long` is mapped to `long` for runtime purposes; values exceeding
 * `Long.MAX_VALUE` lose precision when surfaced through the data view but
 * remain accurate at the indexed level. A future improvement could use a
 * typed sub-field at the index level for unsigned_long specifically.
 */
const SUFFIX_TO_RUNTIME_TYPE: Record<string, RuntimeType> = {
  long: 'long',
  integer: 'long',
  short: 'long',
  byte: 'long',
  unsigned_long: 'long',
  double: 'double',
  float: 'double',
  half_float: 'double',
  scaled_float: 'double',
  date: 'date',
  boolean: 'boolean',
  keyword: 'keyword',
};

/**
 * Suffixes that the template system can emit but that intentionally don't
 * get a runtime field — the indexed value is already independently
 * accessible at its native path in the data view.
 *
 * Currently empty: every supported suffix needs a runtime field because
 * `cases.extended_fields` is `flattened` (sub-keys aren't discoverable as
 * data-view fields). Kept as a structural hook so a future mapping change
 * — e.g. promoting a specific suffix to a typed sub-field — can opt that
 * suffix out of the runtime-field path without touching the rest of the
 * pipeline.
 */
const NO_RUNTIME_FIELD_SUFFIXES = new Set<string>();

/**
 * Every suffix the cases template system can emit — derived once from the
 * two tables above so adding a new template type extends it automatically.
 *
 * Exported for `mappings/schema_drift.test.ts`, which uses it to forbid
 * any mapping field whose leaf ends in `_as_<one of these>` from
 * colliding with a runtime field of the same name.
 */
export const ALL_TEMPLATE_TYPE_SUFFIXES: readonly string[] = [
  ...Object.keys(SUFFIX_TO_RUNTIME_TYPE),
  ...NO_RUNTIME_FIELD_SUFFIXES,
];

/**
 * Suffix → runtime type. Returns:
 *   - the runtime type if the suffix is mapped (e.g. 'long' → 'long',
 *     'keyword' → 'keyword')
 *   - `null` if the suffix is known but intentionally doesn't get a runtime
 *     field (today: nothing; see `NO_RUNTIME_FIELD_SUFFIXES`)
 *   - `undefined` if the suffix is unknown — caller should ignore the field
 */
export const suffixToRuntimeType = (suffix: string): RuntimeType | null | undefined => {
  if (NO_RUNTIME_FIELD_SUFFIXES.has(suffix)) return null;
  return SUFFIX_TO_RUNTIME_TYPE[suffix];
};

/**
 * Charset enforced by `splitSnakeKey`. Defense-in-depth: the snake-key is
 * concatenated verbatim into a Painless string literal in
 * `buildPainlessSource`, so any single quote, backslash, or newline would
 * either break the script or open a script-injection path. Template names
 * are validated upstream (`common/types/domain/template/fields.ts`) but
 * that schema currently allows any string, and we don't want the analytics
 * layer's safety to depend on a sibling team's validation choices. We also
 * cap the total length to keep Painless compile budgets bounded.
 */
const SAFE_SNAKE_KEY = /^[A-Za-z0-9_]+$/;
const MAX_SNAKE_KEY_LENGTH = 256;

/**
 * Splits a snake-key field name into `{ name, suffix }`. Returns `null` if
 * the key has no `_as_<suffix>` segment, exceeds the length cap, or contains
 * any character outside `[A-Za-z0-9_]`.
 *
 * A field path may contain underscores in the user-chosen name (e.g.
 * `risk_score_as_long`) — we always split on the **last** `_as_` so the
 * suffix is recovered correctly regardless of how many underscores the user
 * put in their field name.
 */
export const splitSnakeKey = (snakeKey: string): { name: string; suffix: string } | null => {
  if (snakeKey.length === 0 || snakeKey.length > MAX_SNAKE_KEY_LENGTH) return null;
  if (!SAFE_SNAKE_KEY.test(snakeKey)) return null;
  const marker = '_as_';
  const idx = snakeKey.lastIndexOf(marker);
  if (idx < 0) return null;
  const name = snakeKey.slice(0, idx);
  const suffix = snakeKey.slice(idx + marker.length);
  if (!name || !suffix) return null;
  return { name, suffix };
};

/**
 * Generate the painless source that reads the user-supplied value at
 * `cases.extended_fields.<snakeKey>` and emits a parsed value of the
 * target runtime type.
 *
 * **Access pattern: `doc['cases.extended_fields.<snakeKey>']`.** ES
 * prescribes `doc[parent.subkey]` for `flattened` sub-keys (ES docs,
 * "Retrieving flattened fields") — flattened sub-keys are doc-values-
 * backed under the parent's value stream. Walking `params._source`
 * silently returns no value on synthetic-source / `index.mode: lookup`
 * indices (which `.cases` uses) because `_source` is reconstructed from
 * doc values and the sub-object structure is lost.
 *
 * Iterates the doc-values list so multi-valued template fields publish
 * every value (`emit` may be called more than once per doc).
 *
 * **Defensive by design**: any parse failure falls through silently — the
 * field simply has no value for that doc. Throwing would surface as
 * per-doc errors in Lens / Discover, breaking the field for everyone
 * whenever a single bad value exists.
 *
 * `${snakeKey}` is concatenated into the Painless string literal verbatim;
 * `splitSnakeKey` enforces `[A-Za-z0-9_]+` so the literal is always safe.
 */
export const buildPainlessSource = (snakeKey: string, runtimeType: RuntimeType): string => {
  const fieldPath = `cases.extended_fields.${snakeKey}`;
  // `doc[path]` returns a `ScriptDocValues` instance. `.empty` is the
  // documented short-circuit for "no value present on this doc"; iteration
  // over the instance yields the typed leaf values (Strings for keyword-
  // backed fields, which is how ES indexes flattened sub-keys).
  const guard = `def vals = doc['${fieldPath}']; if (vals == null || vals.empty) { return; }`;

  switch (runtimeType) {
    case 'long':
      return (
        `${guard} ` +
        `for (String v : vals) { ` +
        `if (v == null || v.length() == 0) { continue; } ` +
        `try { emit(Long.parseLong(v)); } catch (Exception e) {} ` +
        `}`
      );
    case 'double':
      return (
        `${guard} ` +
        `for (String v : vals) { ` +
        `if (v == null || v.length() == 0) { continue; } ` +
        `try { emit(Double.parseDouble(v)); } catch (Exception e) {} ` +
        `}`
      );
    case 'date':
      // ISO-8601 with or without offset. `Instant.parse` requires a `Z` or
      // explicit offset; fall back to `LocalDateTime` interpreted in UTC if
      // the user wrote a naive timestamp.
      return (
        `${guard} ` +
        `for (String v : vals) { ` +
        `if (v == null || v.length() == 0) { continue; } ` +
        `try { emit(Instant.parse(v).toEpochMilli()); continue; } catch (Exception e1) {} ` +
        `try { emit(LocalDateTime.parse(v).toInstant(ZoneOffset.UTC).toEpochMilli()); } catch (Exception e2) {} ` +
        `}`
      );
    case 'boolean':
      return (
        `${guard} ` +
        `for (String v : vals) { ` +
        `if (v == null || v.length() == 0) { continue; } ` +
        `try { emit(Boolean.parseBoolean(v)); } catch (Exception e) {} ` +
        `}`
      );
    case 'keyword':
      // No parsing — flattened sub-keys are stored as keyword in ES, so
      // doc-values iteration yields the raw strings directly. Lifts the
      // value out of the opaque `flattened` parent and into a discoverable
      // typed field at `cases.<name>_as_keyword`.
      return (
        `${guard} ` +
        `for (String v : vals) { ` +
        `if (v != null && v.length() > 0) { emit(v); } ` +
        `}`
      );
    default:
      // ip / geo_point / composite — not currently produced by the template
      // system. If a future template type maps here, extend this switch
      // alongside the suffix → runtime type table. The fallthrough emits the
      // raw string so the field at least has a value, even if untyped.
      return (
        `${guard} ` +
        `for (String v : vals) { ` +
        `if (v != null && v.length() > 0) { emit(v); } ` +
        `}`
      );
  }
};

/** A runtime field ready to merge into a data view's `runtimeFieldMap`. */
export interface RuntimeFieldEntry {
  /** Published name in the data view — a direct child of `cases`, e.g. `cases.score_as_long`. */
  fieldName: string;
  spec: RuntimeFieldSpec;
}

/**
 * From a template snake-key, decide whether to emit a runtime field and, if
 * so, return the spec ready to merge into a data view's `runtimeFieldMap`.
 *
 * Returns `null` when the snake-key isn't shaped like `<name>_as_<type>`,
 * the suffix is in `NO_RUNTIME_FIELD_SUFFIXES`, or the suffix is unknown.
 *
 * Publication path: `cases.<snakeKey>` (e.g. `cases.riskScore_as_long`),
 * sitting alongside `cases.title`, `cases.severity`, etc. The painless
 * reads the value via `doc['cases.extended_fields.<snakeKey>']` — the
 * indexed value lives inside a `flattened` field (see `mappings/case.ts`),
 * and ES exposes flattened sub-keys as doc-values-backed paths under the
 * parent's value stream.
 *
 * **Why not shadow the indexed path?**
 * Kibana data views resolve a field name by merging
 * `{ ...runtime, ...mapped }` — mapped fields overwrite runtime ones at the
 * same name. A runtime field at `cases.extended_fields.<snake>` would be
 * silently shadowed by the keyword mapping, and Lens would lose the typed
 * filter operators.
 *
 * Collision risk for the `cases.<snakeKey>` path is bounded by a schema
 * invariant enforced in `mappings/schema_drift.test.ts`: no direct child
 * of `cases` may end in `_as_<type>` for any supported suffix.
 */
export const buildRuntimeFieldEntry = (snakeKey: string): RuntimeFieldEntry | null => {
  const split = splitSnakeKey(snakeKey);
  if (!split) return null;

  const runtimeType = suffixToRuntimeType(split.suffix);
  if (runtimeType == null) return null;

  return {
    fieldName: `cases.${snakeKey}`,
    spec: {
      type: runtimeType,
      script: { source: buildPainlessSource(snakeKey, runtimeType) },
    },
  };
};

/**
 * Stable digest of the snake-keys that drive a runtime field map. Used by
 * `CasesAnalyticsV2DataViewService` to short-circuit the `dvService.get`
 * + `isEqual` diff path when the intended state is byte-identical to the
 * last successful ensure on this node — the dominant cost in template-edit
 * bursts at scale.
 *
 * Inputs are unique-and-sorted before hashing so traversal order doesn't
 * affect the digest. The digest is prefixed with `RUNTIME_FIELDS_BUILD_VERSION`
 * so any change to the suffix → runtime-type table or the Painless transform
 * invalidates every cached fingerprint without a manual cache flush.
 *
 * Truncated to 16 hex chars (~64 bits). Collision probability for any pair
 * is ~1 in 2^32 by the birthday bound; the worst-case fault from a hit
 * would be a real change going undetected on one node until the bootstrap
 * cache TTL elapses (5 min).
 */
export const computeRuntimeFieldsFingerprint = (snakeKeys: readonly string[]): string => {
  const unique = Array.from(new Set(snakeKeys)).sort();
  const hash = createHash('sha1').update(unique.join('\n')).digest('hex').slice(0, 16);
  return `v${RUNTIME_FIELDS_BUILD_VERSION}:${hash}`;
};
