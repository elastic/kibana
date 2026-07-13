/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  durationFormatSchema,
  gaDurationInputUnitToLegacyApi,
  gaDurationOutputUnitToLegacyApi,
  legacyDurationFormatSchema,
} from '@kbn/lens-embeddable-utils';

/**
 * The route-level schema accepts both GA and legacy duration unit names (via `schema.oneOf`) so
 * that neither is rejected outright at the HTTP validation layer. This function performs the
 * additional runtime enforcement in the handler: it recursively walks `value` and validates every
 * `{type:'duration'}` object against the schema that is active for the current feature-flag state.
 *
 * @param value the request body (or any nested value) to inspect
 * @param useGASchemas when `true`, GA unit names are enforced (`min`, `auto`, `auto-approximate`);
 *   when `false`, the legacy schema accepts free-form unit strings (pre-GA behavior)
 * @returns an error message if a duration object uses units from the inactive set, otherwise `undefined`
 */
export const findInvalidDurationFormat = (
  value: unknown,
  useGASchemas: boolean,
  path = ''
): string | undefined => {
  if (value === null || typeof value !== 'object') return undefined;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const err = findInvalidDurationFormat(value[i], useGASchemas, `${path}[${i}]`);
      if (err) return err;
    }
    return undefined;
  }

  const obj = value as Record<string, unknown>;

  if (obj.type === 'duration') {
    const activeSchema = useGASchemas ? durationFormatSchema : legacyDurationFormatSchema;
    try {
      activeSchema.validate(obj);
    } catch (e) {
      const location = path || 'format';
      const hint = useGASchemas
        ? "Use GA unit names (e.g. 'min' not 'm', 'auto-approximate' not 'humanize', 'auto' not 'humanizePrecise')."
        : "The 'asCode.useGASchemas' feature flag is disabled; use legacy unit names (e.g. 'm' not 'min', 'humanize' not 'auto-approximate', 'humanizePrecise' not 'auto').";
      return `[${location}]: ${e.message}. ${hint}`;
    }
    return undefined;
  }

  for (const [key, val] of Object.entries(obj)) {
    const err = findInvalidDurationFormat(val, useGASchemas, path ? `${path}.${key}` : key);
    if (err) return err;
  }

  return undefined;
};

/**
 * Recursively walks an API config and rewrites every `{type:'duration'}` object's `from`/`to`
 * units from GA short-form enums to legacy field-format names (e.g. `s` → `seconds`,
 * `auto-approximate` → `humanize`). Used at the route boundary to down-convert responses when
 * the `asCode.useGASchemas` feature flag is disabled, preserving pre-GA API compatibility.
 *
 * The shared `LensConfigBuilder` always emits GA names; this conversion is applied only in the
 * legacy flag state and returns new values without mutating the builder output.
 *
 * @param value the response body (or any nested value) to convert
 * @returns a structurally-equivalent value with GA duration units replaced by legacy names
 */
export const toLegacyDurationUnits = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => toLegacyDurationUnits(item)) as unknown as T;
  }

  const obj = value as Record<string, unknown>;

  if (obj.type === 'duration') {
    return {
      ...obj,
      ...(typeof obj.from === 'string' ? { from: gaDurationInputUnitToLegacyApi(obj.from) } : {}),
      ...(typeof obj.to === 'string' ? { to: gaDurationOutputUnitToLegacyApi(obj.to) } : {}),
    } as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = toLegacyDurationUnits(val);
  }
  return result as T;
};
