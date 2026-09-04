/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObject } from '@kbn/object-utils';
import type { ExtendedJsonPatch, JsonPatchOp, JsonPatchNoOp } from './types';
import { matchesPrefix, REDACTED } from './utils';

export interface ComputeJsonPatchParams {
  /** The object state before the change. */
  a: Record<string, unknown>;
  /** The object state after the change. */
  b: Record<string, unknown>;
  /**
   * Dot-path keys to exclude from the diff entirely (e.g. system-managed fields
   * like `updated_at`, `version`). Exact and prefix matches are both honoured:
   * ignoring `"user"` also silences `"user.email"`.
   */
  fieldsToIgnore?: readonly string[];
  /**
   * Dot-path keys whose values must be redacted in the output (e.g. ESO
   * encrypted attributes). The comparison still runs normally to detect whether
   * the field changed; only the emitted `value` / `oldValue` is replaced with
   * the `REDACTED` placeholder. Prefix matching applies the same way as
   * `fieldsToIgnore`.
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

const matchesAnyPrefix = (key: string, prefixes: Set<string>): boolean => {
  for (const prefix of prefixes) {
    if (matchesPrefix(key, prefix)) return true;
  }
  return false;
};

const valuesEqual = (x: unknown, y: unknown): boolean => {
  if (Array.isArray(x) || Array.isArray(y)) {
    return JSON.stringify(x) === JSON.stringify(y);
  }
  return x === y;
};

const applyFieldSizeLimit = (value: unknown, limitBytes: number | undefined): unknown => {
  if (limitBytes === undefined) return value;
  const serialized = JSON.stringify(value);
  if (serialized !== undefined && Buffer.byteLength(serialized, 'utf8') > limitBytes) {
    return 'Value above fieldSizeLimit';
  }
  return value;
};

/**
 * Converts a dot-notation path (e.g. `"user.email"`) to an RFC 6901 JSON
 * Pointer (e.g. `"/user/email"`), escaping `~` → `~0` and `/` → `~1`.
 */
export const dotPathToJsonPointer = (dotPath: string): string =>
  '/' +
  dotPath
    .split('.')
    .map((segment) => segment.replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/');

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes a flat, leaf-level diff between two objects and returns it as an
 * Extended JSON Patch document (RFC 6902 + the `oldValue` extension).
 *
 * Both objects are flattened to dot-notation paths, then every leaf key is
 * classified in a single pass:
 * - keys matching `fieldsToIgnore` are dropped entirely
 * - unchanged keys are emitted into `noOps`
 * - changed keys become one op:
 *   - `add`     — present in `b` but not `a` (`value` only)
 *   - `remove`  — present in `a` but not `b` (`oldValue` only)
 *   - `replace` — present in both with a different value (`value` + `oldValue`)
 *
 * Arrays are compared as whole values via `JSON.stringify` (no element-level
 * diffing). Keys matching `fieldsToRedact` still have their change detected but
 * have the emitted value replaced with `REDACTED`. Values whose serialised size
 * exceeds `fieldSizeLimit` are replaced with `"Value above fieldSizeLimit"`.
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
  fieldsToIgnore = [],
  fieldsToRedact = [],
  fieldSizeLimit,
}: ComputeJsonPatchParams): ExtendedJsonPatch => {
  const flatA = flattenObject(a);
  const flatB = flattenObject(b);

  const ignoreSet = new Set(fieldsToIgnore);
  const redactSet = new Set(fieldsToRedact);

  const ops: JsonPatchOp[] = [];
  const noOps: JsonPatchNoOp[] = [];

  for (const key of new Set([...Object.keys(flatA), ...Object.keys(flatB)])) {
    if (matchesAnyPrefix(key, ignoreSet)) continue;

    const inA = Object.hasOwn(flatA, key);
    const inB = Object.hasOwn(flatB, key);
    const path = dotPathToJsonPointer(key);

    if (inA && inB && valuesEqual(flatA[key], flatB[key])) {
      noOps.push({ path });
      continue;
    }

    // Redaction wins over the size limit; a redacted value is never emitted raw.
    const redact = matchesAnyPrefix(key, redactSet);
    const emit = (raw: unknown) => (redact ? REDACTED : applyFieldSizeLimit(raw, fieldSizeLimit));

    if (!inA && inB) {
      ops.push({ op: 'add', path, value: emit(flatB[key]) });
    } else if (inA && !inB) {
      ops.push({ op: 'remove', path, oldValue: emit(flatA[key]) });
    } else {
      ops.push({ op: 'replace', path, value: emit(flatB[key]), oldValue: emit(flatA[key]) });
    }
  }

  return { format: 'json_patch_extended', ops, noOps };
};
