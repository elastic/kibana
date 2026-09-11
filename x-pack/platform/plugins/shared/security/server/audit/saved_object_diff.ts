/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isPlainObject } from 'lodash';

import type { AuditKibana } from '@kbn/core-security-server';

/** Placeholder written in place of redacted (e.g. encrypted) attribute values. */
export const REDACTED = '[redacted]';

/** The `kibana.diff` audit field: RFC 6902 ops (plus `oldValue`) and the unchanged `noOps`. */
export type ExtendedJsonPatch = NonNullable<AuditKibana['diff']>;
export type JsonPatchOp = ExtendedJsonPatch['ops'][number];
export type JsonPatchNoOp = ExtendedJsonPatch['noOps'][number];

export interface ComputeJsonPatchParams {
  /** The object state before the change. */
  a: Record<string, unknown>;
  /** The object state after the change. */
  b: Record<string, unknown>;
  /**
   * Top-level attribute names whose values must be redacted (e.g. ESO encrypted
   * attributes). Changes are still detected; only the emitted `value` /
   * `oldValue` is replaced with `REDACTED`, for the attribute and its children.
   */
  fieldsToRedact?: readonly string[];
  /**
   * Maximum serialised byte size of a single field value. Values whose
   * `JSON.stringify` representation exceeds this limit are replaced with the
   * string `"Value above fieldSizeLimit"`. When omitted, no limit is applied.
   */
  fieldSizeLimit?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Escapes a single object key for use as an RFC 6901 JSON Pointer segment
 * (`~` → `~0`, `/` → `~1`). Literal dots need no escaping — a dot inside a
 * segment is just a character, only `/` separates segments.
 */
export const escapeJsonPointerSegment = (segment: string): string =>
  segment.replace(/~/g, '~0').replace(/\//g, '~1');

/**
 * Flattens a nested object to a map of RFC 6901 JSON Pointers pointing to its
 * leaves. Pointers are built during flattening with each key escaped as a
 * single segment, so a literal dot in a key is unambiguous: `{"host.name": 1}`
 * flattens to `/host.name` while `{host: {name: 1}}` flattens to `/host/name` —
 * the two can never collide. Primitives, arrays, non-plain objects, and empty
 * plain objects are all leaves; a field changing between `undefined` and `{}`
 * therefore still produces a diff entry instead of vanishing.
 */
const flattenToJsonPointers = (
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> => {
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}/${escapeJsonPointerSegment(key)}`;
    if (isPlainObject(value) && Object.keys(value as object).length > 0) {
      flattenToJsonPointers(value as Record<string, unknown>, path, result);
    } else {
      result[path] = value;
    }
  }
  return result;
};

/** `pointer` equals the prefix or is nested under it (`/user` covers `/user/email`). */
const matchesAnyPrefix = (pointer: string, prefixes: Set<string>): boolean => {
  for (const prefix of prefixes) {
    if (pointer === prefix || pointer.startsWith(`${prefix}/`)) return true;
  }
  return false;
};

/** Top-level attribute names as JSON Pointer prefixes (each name is one literal segment). */
const attributeNamesToPointerPrefixes = (names: readonly string[]): Set<string> =>
  new Set(names.map((name) => `/${escapeJsonPointerSegment(name)}`));

const valuesEqual = (x: unknown, y: unknown): boolean => {
  if (Array.isArray(x) || Array.isArray(y)) {
    // Structural: element order matters, key order of nested objects does not.
    return isEqual(x, y);
  }
  // Plain objects only reach here when empty (non-empty ones are recursed into),
  // so two of them are always equal.
  if (isPlainObject(x) && isPlainObject(y)) {
    return true;
  }
  return x === y;
};

const applyFieldSizeLimit = (value: unknown, limitBytes: number | undefined): unknown => {
  if (limitBytes === undefined) return value;
  // JSON.stringify of a string allocates a second copy (plus quotes/escapes).
  // UTF-8 byte length is a lower bound of that serialized size, so oversized
  // strings can skip serialization. Non-strings still go through stringify.
  if (typeof value === 'string' && Buffer.byteLength(value, 'utf8') > limitBytes) {
    return 'Value above fieldSizeLimit';
  }
  const serialized = JSON.stringify(value);
  if (serialized !== undefined && Buffer.byteLength(serialized, 'utf8') > limitBytes) {
    return 'Value above fieldSizeLimit';
  }
  return value;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes a flat, leaf-level diff between two objects and returns it as an
 * Extended JSON Patch document (RFC 6902 + the `oldValue` extension).
 *
 * Both objects are flattened directly to JSON Pointer paths (each key escaped
 * as a single segment, so literal dots in keys cannot collide with nesting),
 * then every leaf pointer is classified in a single pass:
 * - unchanged keys are emitted into `noOps`
 * - changed keys become one op:
 *   - `add`     — present in `b` but not `a` (`value` only)
 *   - `remove`  — present in `a` but not `b` (`oldValue` only)
 *   - `replace` — present in both with a different value (`value` + `oldValue`)
 *
 * Arrays are compared as whole values, structurally (no element-level
 * diffing). Empty objects are leaves: a field changing between `undefined` and
 * `{}` diffs as an `add`/`remove` of `{}` rather than disappearing. Keys
 * matching `fieldsToRedact` still have their change detected but have the
 * emitted value replaced with `REDACTED`. Values whose serialised size exceeds
 * `fieldSizeLimit` are replaced with `"Value above fieldSizeLimit"`.
 *
 * @example
 * ```ts
 * computeJsonPatch({
 *   a: { data_output_id: 'default', legacy_mode: true },
 *   b: { data_output_id: 'logstash-prod', monitoring_enabled: ['logs'] },
 * });
 * // {
 * //   format: 'json_patch_extended',
 * //   ops: [
 * //     { op: 'replace', path: '/data_output_id', value: 'logstash-prod', oldValue: 'default' },
 * //     { op: 'remove', path: '/legacy_mode', oldValue: true },
 * //     { op: 'add', path: '/monitoring_enabled', value: ['logs'] },
 * //   ],
 * //   noOps: [],
 * // }
 * ```
 */
export const computeJsonPatch = ({
  a,
  b,
  fieldsToRedact = [],
  fieldSizeLimit,
}: ComputeJsonPatchParams): ExtendedJsonPatch => {
  const flatA = flattenToJsonPointers(a);
  const flatB = flattenToJsonPointers(b);

  const redactSet = attributeNamesToPointerPrefixes(fieldsToRedact);

  const ops: JsonPatchOp[] = [];
  const noOps: JsonPatchNoOp[] = [];

  for (const path of new Set([...Object.keys(flatA), ...Object.keys(flatB)])) {
    const inA = Object.hasOwn(flatA, path);
    const inB = Object.hasOwn(flatB, path);

    if (inA && inB && valuesEqual(flatA[path], flatB[path])) {
      noOps.push({ path });
      continue;
    }

    // Redaction wins over the size limit; a redacted value is never emitted raw.
    const redact = matchesAnyPrefix(path, redactSet);
    const emit = (raw: unknown) => (redact ? REDACTED : applyFieldSizeLimit(raw, fieldSizeLimit));

    if (!inA && inB) {
      ops.push({ op: 'add', path, value: emit(flatB[path]) });
    } else if (inA && !inB) {
      ops.push({ op: 'remove', path, oldValue: emit(flatA[path]) });
    } else {
      ops.push({ op: 'replace', path, value: emit(flatB[path]), oldValue: emit(flatA[path]) });
    }
  }

  return { format: 'json_patch_extended', ops, noOps };
};
