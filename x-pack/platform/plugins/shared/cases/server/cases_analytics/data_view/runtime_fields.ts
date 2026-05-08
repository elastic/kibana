/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuntimeFieldSpec, RuntimeType } from '@kbn/data-views-plugin/common';

/**
 * The set of suffixes (`_as_<type>`) the cases template system can emit. The
 * source of truth is `common/utils/template_fields.ts#getFieldSnakeKey` which
 * concatenates the field's name with one of the types declared in
 * `common/types/domain/template/fields.ts` (the `BaseFieldSchema.type` union
 * across all field schemas).
 *
 * ES runtime field types are a smaller set than ES mapping types — `keyword`,
 * `long`, `double`, `date`, `boolean`, `ip`, `geo_point`, `composite`. So we
 * coerce all numeric variants down to `long` or `double`. Templates declared
 * as `keyword` get NO runtime field — the indexed value is already keyword,
 * and an override would just add painless overhead with no benefit.
 *
 * `unsigned_long` is mapped to `long` for runtime purposes; values exceeding
 * `Long.MAX_VALUE` lose precision when surfaced through the data view but
 * remain accurate at the indexed level. This trade-off is documented in the
 * cases-analytics README; a future improvement could use a typed sub-field
 * at the index level for unsigned_long specifically.
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
};

const NO_RUNTIME_FIELD_SUFFIXES = new Set(['keyword']);

/**
 * Every suffix the cases template system can emit — derived once from the two
 * tables above so adding a new template type extends it automatically.
 *
 * Exported for `mappings/schema_drift.test.ts`, which uses it to forbid any
 * mapping field whose leaf ends in `_as_<one of these>` from colliding with a
 * runtime field of the same name.
 */
export const ALL_TEMPLATE_TYPE_SUFFIXES: readonly string[] = [
  ...Object.keys(SUFFIX_TO_RUNTIME_TYPE),
  ...NO_RUNTIME_FIELD_SUFFIXES,
];

/**
 * Suffix → runtime type. `null` means no runtime field is needed (already
 * keyword in the index). `undefined` means the suffix is unknown — caller
 * should ignore the field.
 */
export const suffixToRuntimeType = (suffix: string): RuntimeType | null | undefined => {
  if (NO_RUNTIME_FIELD_SUFFIXES.has(suffix)) return null;
  return SUFFIX_TO_RUNTIME_TYPE[suffix];
};

/**
 * Splits a snake-key field name into `[name, suffix]`. Returns `null` if the
 * key has no `_as_<suffix>` segment. A field path may contain underscores in
 * the user-chosen name (e.g. `risk_score_as_long`) — we always split on the
 * **last** `_as_` to recover the suffix correctly.
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
 * Generate the painless source that reads the indexed keyword path
 * `cases.extended_fields.<snakeKey>` and emits a parsed value of the target
 * runtime type. Defensive: any parse failure falls through silently — the
 * runtime field simply has no value for that doc, which is the intended
 * behavior for malformed user input.
 */
export const buildPainlessSource = (snakeKey: string, runtimeType: RuntimeType): string => {
  const indexedPath = `cases.extended_fields.${snakeKey}`;
  const docAccess = `doc['${indexedPath}']`;
  const guard = `if (${docAccess}.size() == 0) { return; } String v = ${docAccess}.value; if (v == null || v.length() == 0) { return; }`;

  switch (runtimeType) {
    case 'long':
      return `${guard} try { emit(Long.parseLong(v)); } catch (Exception e) {}`;
    case 'double':
      return `${guard} try { emit(Double.parseDouble(v)); } catch (Exception e) {}`;
    case 'date':
      // Accept ISO-8601 (with or without offset). `Instant.parse` requires a
      // `Z` or offset; fall back to `LocalDateTime` in UTC if the user wrote
      // a naive timestamp.
      return `${guard} try { emit(Instant.parse(v).toEpochMilli()); return; } catch (Exception e1) {} try { emit(LocalDateTime.parse(v).toInstant(ZoneOffset.UTC).toEpochMilli()); } catch (Exception e2) {}`;
    case 'boolean':
      return `${guard} try { emit(Boolean.parseBoolean(v)); } catch (Exception e) {}`;
    default:
      // ip / geo_point / keyword / composite — not currently produced by the
      // template system. If a future template type maps here, extend this
      // switch alongside the suffix → runtime type table.
      return `${guard} emit(v);`;
  }
};

/** A runtime field ready to merge into a data view's `runtimeFieldMap`. */
export interface RuntimeFieldEntry {
  /** Published name in the data view, a direct child of `cases` — e.g. `cases.score_as_long`. */
  fieldName: string;
  spec: RuntimeFieldSpec;
}

/**
 * From a template snake-key, decide whether to emit a runtime field and, if
 * so, return the spec ready to merge into a data view's `runtimeFieldMap`.
 *
 * Returns `null` when the suffix doesn't need a runtime field — either the
 * snake-key isn't shaped like `<name>_as_<type>`, the suffix is `keyword`
 * (already keyword in the index), or the suffix is unknown.
 *
 * Publication path: `cases.<snakeKey>` (e.g. `cases.riskScore_as_long`),
 * sitting alongside `cases.title`, `cases.severity`, etc. The painless reads
 * from the indexed keyword `cases.extended_fields.<snakeKey>` under the hood.
 *
 * Why not shadow the indexed path directly?
 * Kibana data views resolve a field name by merging `{ ...runtime, ...mapped }`
 * — mapped fields overwrite runtime ones at the same name. A runtime field at
 * `cases.extended_fields.<snake>` would be silently shadowed by the keyword
 * mapping, and Lens would lose the typed filter operators.
 *
 * Collision risk for the `cases.<snakeKey>` path is bounded by a schema
 * invariant: no direct child of `cases` may end in `_as_<type>` for any
 * supported suffix. Enforced at CI by `mappings/schema_drift.test.ts`.
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
