/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Utilities for working with case extended_fields in the analytics write path.
 *
 * The SO stores extended_fields as a flat Record<string, string | null>. Keys
 * use a *_as_<type> suffix convention (e.g. "severity_score_as_long") so the
 * analytics content index can auto-type them via dynamic_templates.
 *
 * When dual-writing (cases created/updated → immediately indexed into the
 * analytics index), call `buildExtendedFieldsForAnalytics` to cast string
 * values to the correct JS primitives before sending to Elasticsearch.
 *
 * In the backfill/reindex path the Painless script copies the raw strings and
 * Elasticsearch's own coercion handles numeric/boolean/date parsing according
 * to the field mapping, so these utilities are not needed there.
 */

const TYPE_SUFFIX_REGEX = /_as_(keyword|text|long|double|date|boolean|ip|date_range)$/;

/**
 * Extracts the ES type suffix from a field key, e.g.
 *   'severity_score_as_long' → 'long'
 * Returns null when the key has no recognised *_as_<type> suffix.
 */
export function getFieldType(key: string): string | null {
  const match = key.match(TYPE_SUFFIX_REGEX);
  return match ? match[1] : null;
}

/**
 * Casts a single extended-field string value to the JS primitive that matches
 * the field's *_as_<type> suffix.
 *
 * Throws if the value cannot be cast to the indicated type (e.g. "abc" → long).
 */
export function castExtendedFieldValue(key: string, stringValue: string): unknown {
  const type = getFieldType(key);

  switch (type) {
    case 'long': {
      const longVal = parseInt(stringValue, 10);
      if (isNaN(longVal)) {
        throw new Error(`Cannot cast "${stringValue}" to long for field "${key}"`);
      }
      return longVal;
    }
    case 'double': {
      const doubleVal = parseFloat(stringValue);
      if (isNaN(doubleVal)) {
        throw new Error(`Cannot cast "${stringValue}" to double for field "${key}"`);
      }
      return doubleVal;
    }
    case 'boolean':
      return stringValue.toLowerCase() === 'true';
    case 'date_range':
      return JSON.parse(stringValue);
    case 'keyword':
    case 'text':
    case 'ip':
    case 'date':
      return stringValue;
    default:
      // Unknown suffix — pass through as-is.
      return stringValue;
  }
}

/**
 * Converts the SO's extended_fields flat-object (all string values) into an
 * object whose values are the correctly-typed JS primitives for direct
 * Elasticsearch indexing in the analytics content index.
 *
 * Null values are omitted from the output (they represent "not set").
 * Fields that fail to cast are skipped and a warning is logged.
 *
 * Returns undefined when the input is undefined or when all values are null.
 */
export function buildExtendedFieldsForAnalytics(
  soExtendedFields: Record<string, string | null> | undefined,
  logger?: { warn: (msg: string) => void }
): Record<string, unknown> | undefined {
  if (!soExtendedFields) return undefined;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(soExtendedFields)) {
    if (value == null) continue;

    try {
      result[key] = castExtendedFieldValue(key, value);
    } catch (error) {
      if (logger) {
        logger.warn(
          `Failed to cast extended field "${key}" with value "${value}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
