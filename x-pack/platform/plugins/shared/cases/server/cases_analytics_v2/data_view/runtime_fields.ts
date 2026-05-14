/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuntimeFieldSpec, RuntimeType } from '@kbn/data-views-plugin/common';

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
 * keyword runtime field at `cases.<name>_as_keyword` that emits the raw
 * string from `_source`. Without this, every `keyword`-typed template
 * field would be invisible to the analytics surface.
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
 * Every suffix the cases template system can emit — derived once from the two
 * tables above so adding a new template type extends it automatically.
 *
 * Exported for `mappings/schema_drift.test.ts` (added in a later commit),
 * which uses it to forbid any mapping field whose leaf ends in
 * `_as_<one of these>` from colliding with a runtime field of the same name.
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
 * Splits a snake-key field name into `{ name, suffix }`. Returns `null` if
 * the key has no `_as_<suffix>` segment.
 *
 * A field path may contain underscores in the user-chosen name (e.g.
 * `risk_score_as_long`) — we always split on the **last** `_as_` so the
 * suffix is recovered correctly regardless of how many underscores the user
 * put in their field name.
 */
export const splitSnakeKey = (snakeKey: string): { name: string; suffix: string } | null => {
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
 * `cases.extended_fields.<snakeKey>` (via `_source`) and emits a parsed
 * value of the target runtime type.
 *
 * **Why `_source` rather than `doc[...]`.** `cases.extended_fields` is
 * mapped as `flattened` (see `mappings/case.ts` for the field-limit
 * rationale). `flattened` sub-keys aren't independently doc-values-backed,
 * so per-key access has to go through `_source`. The trade-off is small
 * per-doc overhead at query time vs. unbounded sub-key cardinality at index
 * time — for the volumes this surface is sized for, the right call.
 *
 * **Defensive by design**: any parse failure falls through silently — the
 * runtime field simply has no value for that doc, which is the intended
 * behaviour for malformed user input. The alternative (throwing) would
 * surface as errors per-doc in Lens / Discover, breaking the user
 * experience for the whole field whenever a single bad value exists.
 */
export const buildPainlessSource = (snakeKey: string, runtimeType: RuntimeType): string => {
  // Defensive `_source` walk: `params._source` may be null on docs without
  // source; the nested objects may be absent on partial writes. Each step
  // returns early instead of throwing — see "defensive by design" above.
  // Use `Map.get(key)` for the leaf so snake-keys with any character set
  // resolve correctly (template field names are user-supplied).
  const guard =
    `def src = params._source; if (src == null) { return; } ` +
    `def c = src.cases; if (c == null) { return; } ` +
    `def ef = c.extended_fields; if (ef == null) { return; } ` +
    `def raw = ef.get('${snakeKey}'); if (raw == null) { return; } ` +
    `String v = raw instanceof String ? (String) raw : raw.toString(); ` +
    `if (v.length() == 0) { return; }`;

  switch (runtimeType) {
    case 'long':
      return `${guard} try { emit(Long.parseLong(v)); } catch (Exception e) {}`;
    case 'double':
      return `${guard} try { emit(Double.parseDouble(v)); } catch (Exception e) {}`;
    case 'date':
      // ISO-8601 with or without offset. `Instant.parse` requires a `Z` or
      // explicit offset; fall back to `LocalDateTime` interpreted in UTC if
      // the user wrote a naive timestamp.
      return `${guard} try { emit(Instant.parse(v).toEpochMilli()); return; } catch (Exception e1) {} try { emit(LocalDateTime.parse(v).toInstant(ZoneOffset.UTC).toEpochMilli()); } catch (Exception e2) {}`;
    case 'boolean':
      return `${guard} try { emit(Boolean.parseBoolean(v)); } catch (Exception e) {}`;
    case 'keyword':
      // No parsing — `flattened` sub-keys come back from `_source` already
      // string-shaped (the guard above coerces non-strings via
      // `toString()`). Emitting `v` lifts the value out of the opaque
      // `flattened` parent and into a discoverable typed field at
      // `cases.<name>_as_keyword`.
      return `${guard} emit(v);`;
    default:
      // ip / geo_point / composite — not currently produced by the template
      // system. If a future template type maps here, extend this switch
      // alongside the suffix → runtime type table. The fallthrough emits the
      // raw string so the field at least has a value, even if untyped.
      return `${guard} emit(v);`;
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
 * sitting alongside `cases.title`, `cases.severity`, etc. The painless reads
 * the raw string from `params._source.cases.extended_fields.<snakeKey>`
 * under the hood (the indexed value lives inside a `flattened` field —
 * see `mappings/case.ts`).
 *
 * **Why not shadow the indexed path?**
 * Kibana data views resolve a field name by merging
 * `{ ...runtime, ...mapped }` — mapped fields overwrite runtime ones at the
 * same name. A runtime field at `cases.extended_fields.<snake>` would be
 * silently shadowed by the keyword mapping, and Lens would lose the typed
 * filter operators.
 *
 * Collision risk for the `cases.<snakeKey>` path is bounded by a schema
 * invariant enforced at CI by `mappings/schema_drift.test.ts` (added in a
 * later commit): no direct child of `cases` may end in `_as_<type>` for
 * any supported suffix.
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
