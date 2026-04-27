/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldCamelKey, getFieldSnakeKey } from '../../../common/utils/template_fields';

/**
 * The set of `type` values that template fields can declare. Mirrors the
 * `type` literals on the discriminated FieldSchema in
 * `common/types/domain/template/fields.ts` — keep in sync if a new field
 * control is added to that union.
 */
const FLOAT_TYPES = new Set([
  'double',
  'float',
  'half_float',
  'scaled_float',
]);
const INT_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'unsigned_long',
]);

/**
 * Maps a template field's declared `type` to the ES|QL type-conversion
 * function we wrap the JSON_EXTRACT reference in. Returns `null` for
 * `keyword`: JSON_EXTRACT already produces a keyword, so the emitted
 * EVAL line is a plain rename in that case.
 */
export const esqlCastFunctionForType = (type: string): string | null => {
  if (type === 'date') return 'TO_DATETIME';
  if (FLOAT_TYPES.has(type)) return 'TO_DOUBLE';
  if (INT_TYPES.has(type)) return 'TO_LONG';
  if (type === 'keyword') return null;
  return null;
};

export interface TemplateFieldRef {
  name: string;
  type: string;
}

interface ExtendedFieldEval {
  /** `${name}_as_${type}` — flattened sub-key in `cases.extended_fields`. */
  snakeKey: string;
  /** camelCased output column, e.g. `riskScoreAsLong`. */
  camelKey: string;
  /** Full EVAL fragment to drop into the view query. */
  evalLine: string;
}

/**
 * ES|QL does not yet read `flattened` mappings as typed sub-keys, so the
 * view extracts each extended field from `_source` via `JSON_EXTRACT`.
 * The view's `FROM` clause must include `METADATA _source` for these
 * EVALs to resolve.
 *
 * `JSON_EXTRACT` always returns a keyword; the type-specific cast (TO_LONG,
 * TO_DOUBLE, TO_DATETIME) is layered on top.
 */
export const extendedFieldsToEval = (
  fields: TemplateFieldRef[]
): ExtendedFieldEval[] => {
  const seen = new Set<string>();
  const out: ExtendedFieldEval[] = [];
  for (const field of fields) {
    const snakeKey = getFieldSnakeKey(field.name, field.type);
    if (seen.has(snakeKey)) continue;
    seen.add(snakeKey);
    const camelKey = getFieldCamelKey(field.name, field.type);
    const cast = esqlCastFunctionForType(field.type);
    const ref = `JSON_EXTRACT(_source, "cases.extended_fields.${snakeKey}")`;
    const evalLine = cast === null ? `${camelKey} = ${ref}` : `${camelKey} = ${cast}(${ref})`;
    out.push({ snakeKey, camelKey, evalLine });
  }
  return out;
};
