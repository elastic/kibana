/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Matches the `_as_<type>` suffix on extended field keys.
 * Supported types: keyword, text, long, double, date, boolean, ip, date_range
 */
const TYPE_SUFFIX_REGEX = /_as_(keyword|text|long|double|date|boolean|ip|date_range)$/;

/**
 * Extracts the type suffix from an extended field key.
 * Returns null if the key has no recognised type suffix.
 *
 * @example
 *   getFieldType('severity_score_as_long') // → 'long'
 *   getFieldType('no_suffix')              // → null
 */
export function getFieldType(key: string): string | null {
  const match = key.match(TYPE_SUFFIX_REGEX);
  return match ? match[1] : null;
}

/**
 * Casts a string value to the native type implied by the key's `_as_<type>` suffix.
 *
 * Values are always stored as strings in the `flattened` SO field; this function
 * converts them to the right native type before writing to the analytics index so
 * that Elasticsearch's dynamic_templates can apply the correct mapping.
 *
 * Throws on invalid numeric/JSON values so the caller can choose to skip the field.
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
      // Unknown suffix — pass through as string
      return stringValue;
  }
}

/**
 * Converts the `extended_fields` flat map from the cases SO (all string values)
 * into a typed analytics document fragment suitable for indexing.
 *
 * - null values are omitted (the field simply doesn't appear in the document).
 * - Fields that fail type casting are skipped and an optional logger.warn is called.
 * - Returns undefined if the input is undefined or all values are null.
 */
export function buildExtendedFieldsForAnalytics(
  soExtendedFields: Record<string, string | null> | Record<string, string> | undefined,
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
